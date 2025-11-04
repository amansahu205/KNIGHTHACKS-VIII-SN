import pandas as pd
import numpy as np
import umap
import hdbscan
import plotly.express as px
import json
import os
import joblib
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

print("Loading Embedding Model (one-time)...")
# Load model once globally to save time
MODEL = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded.")

def run_analysis(hack_file_path, acc_file_path, output_dir):
    """
    Runs the full analysis pipeline on the provided CSV files
    and saves the results AND models in the output_dir.
    """
    print(f"Starting analysis pipeline on {hack_file_path}...")
    
    # Ensure output directories exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # --- PHASE 1: DATA PREPROCESSING ---
        print("Phase 1: Loading and preprocessing data...")
        df_hack = pd.read_csv(hack_file_path, encoding='latin1')
        df_acc = pd.read_csv(acc_file_path, encoding='latin1')

        # Clean NaNs
        for col in ['capability', 'description', 'initiative_title', 'primary_category']:
            df_hack[col] = df_hack[col].fillna('')
        df_acc['name'] = df_acc['name'].fillna('')
        df_acc['description'] = df_acc['description'].fillna('')

        # Create unified text fields
        df_hack['request_text'] = (
            df_hack['capability'] + ' ' + 
            df_hack['description'] + ' ' + 
            df_hack['initiative_title'] + ' ' + 
            df_hack['primary_category']
        ).str.lower()
        
        df_acc['accelerator_text'] = (
            df_acc['name'] + ' ' + df_acc['description']
        ).str.lower()

        # --- PHASE 2: VECTORIZATION ---
        print("Phase 2: Vectorizing text...")
        accelerator_vectors = MODEL.encode(df_acc['accelerator_text'].tolist(), show_progress_bar=True)
        request_vectors = MODEL.encode(df_hack['request_text'].tolist(), show_progress_bar=True)

        # --- PHASE 3: CLUSTERING & 2D EMBEDDING ---
        print("Phase 3: Clustering requests...")
        reducer_clust = umap.UMAP(n_neighbors=15, n_components=15, min_dist=0.0, random_state=42)
        reduced_vectors_clust = reducer_clust.fit_transform(request_vectors)

        # --- FIX #1: Add prediction_data=True ---
        # This is essential for the .approximate_predict() function to work.
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=10, 
            gen_min_span_tree=True,
            prediction_data=True  # <-- THIS WAS THE BUG
        )
        # --- END OF FIX #1 ---

        clusterer.fit(reduced_vectors_clust)
        df_hack['cluster'] = clusterer.labels_

        print("Creating 2D embeddings for plotting...")
        reducer_2d = umap.UMAP(n_components=2, random_state=42)
        embedding_2d = reducer_2d.fit_transform(request_vectors)
        df_hack['x'] = embedding_2d[:, 0]

        # --- FIX #2: Correct Y-axis assignment ---
        df_hack['y'] = embedding_2d[:, 1] # <-- THIS WAS THE BUG (was [:, 0])
        # --- END OF FIX #2 ---
        
        # Save the full, processed request data
        df_hack.to_csv(os.path.join(output_dir, 'processed_requests.csv'), index=False)

        # --- PHASE 4: GAP ANALYSIS & RECOMMENDATIONS ---
        print("Phase 4: Running gap analysis...")
        cluster_analysis = []
        all_clusters = df_hack[df_hack['cluster'] != -1]['cluster'].unique()

        for cluster_id in all_clusters:
            cluster_requests = df_hack[df_hack['cluster'] == cluster_id]
            cluster_vectors = request_vectors[cluster_requests.index]
            
            centroid = cluster_vectors.mean(axis=0).reshape(1, -1)
            similarities = cosine_similarity(centroid, accelerator_vectors)
            max_similarity = similarities.max()
            best_fit_accelerator = df_acc.iloc[similarities.argmax()]['name']
            
            tfidf = TfidfVectorizer(stop_words='english', max_features=5)
            try:
                tfidf.fit(cluster_requests['request_text'])
                keywords = ', '.join(tfidf.get_feature_names_out())
            except ValueError:
                keywords = "n/a"

            cluster_analysis.append({
                'id': int(cluster_id),
                'keywords': keywords,
                'demand': len(cluster_requests),
                'gap': float(1 - max_similarity),
                'best_fit': best_fit_accelerator
            })

        df_recommendations = pd.DataFrame(cluster_analysis)
        df_recommendations = df_recommendations.sort_values(by=['demand', 'gap'], ascending=[False, False])
        
        df_recommendations.to_json(os.path.join(output_dir, 'recommendations.json'), orient='records')

        # --- PHASE 5: GENERATE DATA FOR FRONTEND VISUALS ---
        print("Phase 5: Generating frontend data...")
        
        plot_df = df_hack[df_hack['cluster'] != -1].copy()
        plot_df['cluster'] = plot_df['cluster'].astype(str)
        plot_df_json = plot_df[['x', 'y', 'cluster', 'number', 'initiative_title', 'primary_category']]
        plot_df_json.to_json(os.path.join(output_dir, 'cluster_plot.json'), orient='records')

        category_counts = df_hack['primary_category'].value_counts()
        if len(category_counts) > 10:
            top_10 = category_counts.nlargest(10)
            other_count = category_counts.iloc[10:].sum()
            top_10['Other'] = other_count
            category_counts = top_10
        
        category_data = {'labels': category_counts.index.tolist(), 'values': category_counts.values.tolist()}
        with open(os.path.join(output_dir, 'category_data.json'), 'w') as f:
            json.dump(category_data, f)
            
        # --- PHASE 6: SAVE MODELS FOR LIVE AGENT ---
        print("Phase 6: Saving models for live agent...")
        joblib.dump(reducer_clust, os.path.join(output_dir, 'umap_reducer_clust.joblib'))
        joblib.dump(clusterer, os.path.join(output_dir, 'hdbscan_clusterer.joblib'))
        np.save(os.path.join(output_dir, 'accelerator_vectors.npy'), accelerator_vectors)
        df_acc.to_csv(os.path.join(output_dir, 'processed_accelerators.csv'), index=False)
        print("--- Analysis Pipeline Finished Successfully! ---")

        return {"status": "success", "message": f"Analysis complete. Found {len(all_clusters)} clusters."}

    except Exception as e:
        print(f"Error in analysis pipeline: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == '__main__':
    print("Running in standalone test mode...")
    run_analysis(
        hack_file_path='u_hack.csv',
        acc_file_path='accelerators.csv',
        output_dir='static/data'
    )