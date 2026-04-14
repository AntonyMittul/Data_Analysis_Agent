import os
from app.config.settings import DATA_DIR


def save_uploaded_file(file):

    file_path = os.path.join(DATA_DIR, file.filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    return file_path