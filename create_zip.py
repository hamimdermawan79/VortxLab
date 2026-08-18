import os
import zipfile
import shutil

source_dir = r"C:\Project\VortXLabs1.2"
output_filename = r"C:\Project\VortXLabs1.2\VortX_Deployment_Package.zip"

excludes = ['.venv', 'node_modules', '.next', '.git', '.claude', 'deploy_package', '__pycache__', 'VortX_Deployment_Package.zip']

def should_exclude(path):
    for ex in excludes:
        if f"\\{ex}\\" in path or path.endswith(f"\\{ex}"):
            return True
    return False

with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        
        for file in files:
            file_path = os.path.join(root, file)
            if not should_exclude(file_path):
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

print("ZIP package created at:", output_filename)
