import os
import pandas as pd
import numpy as np
import joblib
import hdbscan
import json
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from werkzeug.utils import secure_filename
from analysis_pipeline import run_analysis, MODEL  # Import the pipeline and the global MODEL
from sklearn.metrics.pairwise import cosine_similarity

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'static/data'
ALLOWED_EXTENSIONS = {'csv'}

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

# --- GLOBAL MODEL CACHE ---
# This will hold our trained models in memory
model_cache = {
    "reducer": None,
    "clusterer": None,
    "acc_vectors": None,
    "df_acc": None,
    "df_reco": None
}

def load_models_into_cache():
    """Loads all necessary models from the data folder into the global cache."""
    print("Attempting to load models into cache...")
    try:
        data_dir = app.config['DATA_FOLDER']
        model_cache["reducer"] = joblib.load(os.path.join(data_dir, 'umap_reducer_clust.joblib'))
        model_cache["clusterer"] = joblib.load(os.path.join(data_dir, 'hdbscan_clusterer.joblib'))
        model_cache["acc_vectors"] = np.load(os.path.join(data_dir, 'accelerator_vectors.npy'))
        model_cache["df_acc"] = pd.read_csv(os.path.join(data_dir, 'processed_accelerators.csv'))
        
        with open(os.path.join(data_dir, 'recommendations.json'), 'r') as f:
            # Load recommendations and key by cluster ID for fast lookup
            recos = json.load(f)
            model_cache["df_reco"] = {item['id']: item for item in recos}
            
        print("All models loaded successfully.")
        return True
    except FileNotFoundError:
        print("Model files not found. Please run analysis first.")
        return False
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- HTML PAGE ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# --- API ENDPOINTS ---

@app.route('/api/recommendations')
def get_recommendations():
    try:
        return send_from_directory(app.config['DATA_FOLDER'], 'recommendations.json')
    except FileNotFoundError:
        return jsonify({"error": "Data not found. Please run analysis."}), 404

@app.route('/api/cluster-plot')
def get_cluster_plot_data():
    try:
        return send_from_directory(app.config['DATA_FOLDER'], 'cluster_plot.json')
    except FileNotFoundError:
        return jsonify({"error": "Data not found. Please run analysis."}), 404

@app.route('/api/category-data')
def get_category_data():
    try:
        return send_from_directory(app.config['DATA_FOLDER'], 'category_data.json')
    except FileNotFoundError:
        return jsonify({"error": "Data not found. Please run analysis."}), 404

@app.route('/api/cluster-details')
def get_cluster_details():
    cluster_id = request.args.get('id', type=int)
    if cluster_id is None:
        return jsonify({"error": "Missing 'id' parameter"}), 400
    try:
        csv_path = os.path.join(app.config['DATA_FOLDER'], 'processed_requests.csv')
        df = pd.read_csv(csv_path)
        cluster_df = df[df['cluster'] == cluster_id]
        details_df = cluster_df[['number', 'initiative_title', 'description', 'primary_category']]
        return details_df.to_json(orient='records')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- NEW: EXPORT ENDPOINT ---
@app.route('/api/export-recommendations')
def export_recommendations():
    """Exports the recommendations table as a CSV file."""
    try:
        json_path = os.path.join(app.config['DATA_FOLDER'], 'recommendations.json')
        df = pd.read_json(json_path)
        
        # Re-order columns for a clean export
        df = df[['id', 'keywords', 'demand', 'gap', 'best_fit']]
        
        csv_data = df.to_csv(index=False)
        
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=accelerator_recommendations.csv"}
        )
    except FileNotFoundError:
        return "Data not found. Please run analysis first.", 404
    except Exception as e:
        return str(e), 500

# --- NEW: LIVE AGENT ENDPOINT ---
@app.route('/api/analyze-request', methods=['POST'])
def analyze_request():
    """Analyzes a single text request and returns matches."""
    # Ensure models are loaded
    if model_cache["clusterer"] is None:
        if not load_models_into_cache():
            return jsonify({"error": "Models not loaded. Please run analysis via /admin page."}), 503

    try:
        data = request.get_json()
        if 'text' not in data or not data['text']:
            return jsonify({"error": "No text provided."}), 400
        
        text = data['text']
        
        # 1. Embed the new request
        new_vector = MODEL.encode([text])
        
        # 2. Find Closest Existing Accelerator
        sims = cosine_similarity(new_vector, model_cache["acc_vectors"])
        best_match_idx = sims.argmax()
        best_match_score = float(sims.max())
        best_match_name = model_cache["df_acc"].iloc[best_match_idx]['name']

        # 3. Classify Emerging Need
        reduced_vec = model_cache["reducer"].transform(new_vector)
        try:
            
            cluster_label, strength = hdbscan.approximate_predict(model_cache["clusterer"], reduced_vec)
            cluster_id = int(cluster_label[0])
        except Exception as e:
            print(f"HDBSCAN prediction failed: {e}. Classifying as noise.")
            cluster_id = -1 

        cluster_info = None
        if cluster_id != -1 and cluster_id in model_cache["df_reco"]:
            cluster_info = model_cache["df_reco"][cluster_id]

        # 4. Final Recommendation
        recommendation = ""
        if cluster_info:
            if cluster_info['gap'] > 0.4:
                recommendation = "ACTION: Prioritize for Development. This request belongs to a high-demand, high-gap area."
            else:
                recommendation = f"ACTION: Address with Existing. This request is well-covered by our portfolio (Best Fit: '{cluster_info['best_fit']}')."
        else:
            recommendation = "ACTION: Review Manually. This is a unique request and does not match a known emerging trend."

        return jsonify({
            "best_match_name": best_match_name,
            "best_match_score": best_match_score,
            "cluster_id": cluster_id,
            "cluster_info": cluster_info, # This will be null if cluster_id is -1 or not found
            "recommendation": recommendation
        })
        
    except Exception as e:
        print(f"Error in /api/analyze-request: {e}")
        return jsonify({"error": str(e)}), 500

# --- FILE UPLOAD & ANALYSIS ROUTE ---
@app.route('/upload', methods=['POST'])
def upload_and_run_analysis():
    if 'hack_file' not in request.files or 'acc_file' not in request.files:
        return jsonify({"status": "error", "message": "Missing file(s)"}), 400
    
    hack_file = request.files['hack_file']
    acc_file = request.files['acc_file']
    
    if hack_file.filename == '' or acc_file.filename == '':
        return jsonify({"status": "error", "message": "No selected file(s)"}), 400
        
    if hack_file and allowed_file(hack_file.filename) and \
       acc_file and allowed_file(acc_file.filename):
        
        hack_filename = secure_filename(hack_file.filename)
        acc_filename = secure_filename(acc_file.filename)
        hack_path = os.path.join(app.config['UPLOAD_FOLDER'], hack_filename)
        acc_path = os.path.join(app.config['UPLOAD_FOLDER'], acc_filename)
        
        hack_file.save(hack_path)
        acc_file.save(acc_path)
        
        print(f"Files saved. Running analysis...")
        
        # Run the pipeline
        result = run_analysis(
            hack_file_path=hack_path,
            acc_file_path=acc_path,
            output_dir=app.config['DATA_FOLDER']
        )
        
        # After analysis, clear the cache and reload models
        if result['status'] == 'success':
            load_models_into_cache() # Reload the cache with new models
        
        return jsonify(result)

    return jsonify({"status": "error", "message": "Invalid file type"}), 400

# --- RUN THE APP ---
if __name__ == '__main__':
    # Attempt to load models on startup
    load_models_into_cache()
    
    # Get port from environment variable (for deployment) or use 5000 for local
    port = int(os.environ.get('PORT', 5000))
    
    print("\nStarting Flask server...")
    print(f"Access the dashboard at http://127.0.0.1:{port}")
    print(f"Access the admin page at http://127.0.0.1:{port}/admin")
    app.run(debug=False, host='0.0.0.0', port=port)