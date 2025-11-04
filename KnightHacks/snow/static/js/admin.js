document.addEventListener('DOMContentLoaded', () => {

    const uploadForm = document.getElementById('upload-form');
    const runBtn = document.getElementById('run-analysis-btn');
    const statusMessage = document.getElementById('status-message');
    const hackFileInput = document.getElementById('hack_file');
    const accFileInput = document.getElementById('acc_file');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const hackFile = hackFileInput.files[0];
        const accFile = accFileInput.files[0];

        if (!hackFile || !accFile) {
            showStatus('Please select both files.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('hack_file', hackFile);
        formData.append('acc_file', accFile);

        // Show loading state
        runBtn.disabled = true;
        runBtn.textContent = 'Processing...';
        showStatus('Uploading and processing files. This may take a minute...', 'loading');

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                showStatus(`Success! ${result.message}. You can now return to the dashboard to see the new results.`, 'success');
            } else {
                throw new Error(result.message || 'An unknown error occurred.');
            }

        } catch (error) {
            console.error(error);
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            // Reset button
            runBtn.disabled = false;
            runBtn.textContent = 'Run Analysis';
        }
    });

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
    }
});