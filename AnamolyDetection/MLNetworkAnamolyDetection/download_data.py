import kagglehub
import shutil
import os

# download dataset
path = kagglehub.dataset_download("dhoogla/cicids-collection")
print("Downloaded to:", path)

# copy to your project folder
dest = "cicids_data/"
os.makedirs(dest, exist_ok=True)
shutil.copytree(path, dest, dirs_exist_ok=True)
print("Copied to cicids_data/")