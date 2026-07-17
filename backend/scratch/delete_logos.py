import os
import shutil

path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\uploads\logos'

if os.path.exists(path):
    for filename in os.listdir(path):
        file_path = os.path.join(path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
                print(f"Deleted {filename}")
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
                print(f"Deleted directory {filename}")
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')
else:
    print("Path does not exist")
