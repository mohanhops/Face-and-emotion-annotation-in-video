from flask import Flask, jsonify, render_template, request
from werkzeug import secure_filename
import cv2
import math
import os
import tempfile
import zipfile
import sys
import time
import shutil


app = Flask(__name__, static_url_path='/static')
app = Flask(__name__, template_folder='./templates')

APP_ROOT = os.path.dirname(os.path.abspath(__file__))

ZIP_FOLDER = os.path.join(APP_ROOT, 'static\\uploads')
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'static\\temp_video')
IMAGES_FOLDER = os.path.join(APP_ROOT, 'static\\temp_frames')

app.config['ZIP_FOLDER'] = ZIP_FOLDER
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['IMAGES_FOLDER'] = IMAGES_FOLDER

@app.route('/uploadajax', methods = ['POST'])
def uploadfile():
    if request.method == 'POST':
        zip_files = os.listdir(ZIP_FOLDER)
        file = request.files['file']
        filename = secure_filename(file.filename)
        f_name, ext = os.path.splitext(filename)

        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        file_path = os.path.join(app.config['UPLOAD_FOLDER'])+"\\"+filename

        cap = cv2.VideoCapture(file_path)
        frameCount = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frameRate = cap.get(cv2.CAP_PROP_FPS)
        fps = str(frameRate)

        f_zip = f_name+'.zip'

        if f_zip in zip_files:
            print("\nFile uploaded")
            return jsonify({'ZIP': f_zip, 'fps': fps})

        else:
            images_folder_path = os.path.join(app.config['IMAGES_FOLDER'])+"\\"+f_name

            try:
                os.makedirs(images_folder_path)
            except OSError:
                if not os.path.isdir(images_folder_path):
                    raise

            while(cap.isOpened()):
                frameId = cap.get(1) #current frame number
                progress(frameId, frameCount, 'loading video')
                ret, frame = cap.read()
                if (ret != True):
                    break

                img_name = images_folder_path + "/%d"%frameId+".jpg"
                cv2.imwrite(img_name, frame)
                im = cv2.imread(img_name)
                font = cv2.FONT_HERSHEY_SIMPLEX
                f_num = str(round(frameId))
                cv2.putText(im, f_num, (10,25), font, 1, (0,255,0),2)
                cv2.imwrite(img_name, im)

            cap.release()
            print("\nFrames extraction completed")

            f_zip = f_name+".zip"
             
            zip_file_path = os.path.join(app.config['ZIP_FOLDER'] , f_zip)
            
            images_zip = zipfile.ZipFile(zip_file_path, 'w')
            for folder, subfolders, files in os.walk(images_folder_path):
                for file in files:
                    if file.endswith('.jpg'):
                        images_zip.write(os.path.join(folder, file), \
                                         os.path.relpath(os.path.join(folder,file), \
                                                         images_folder_path), compress_type = zipfile.ZIP_DEFLATED)

            images_zip.close()
            shutil.rmtree(images_folder_path)#remove temp folder
            os.remove(file_path)#remove temp file

            return jsonify({'ZIP': f_zip, 'fps': fps})


def progress(count, total, status):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))

    percents = round(100.0 * count / float(total), 1)
    bar = '#' * filled_len + '-' * (bar_len - filled_len)
    sys.stdout.write('\r[%s] %s%s ...%s' % (bar, percents, '%', status))
    sys.stdout.flush()

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(threaded=True) 
