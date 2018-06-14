# Face-and-emotion-annotation-in-video

Video Annotation tool (VAT) is used to annotate videos at frame level, each face in frame has “Name”, “ID” and “Emotion”. Face information such as Bounding box, Expression will be automatically carryout to the next frame, user can edit the face information at any point of time. 

**Requirements**
1. Python 3.x (3.6 is Recommended)
2. Pip 
3. opencv (cmd to install: pip opencv-python)
4. Flask server (cmd to install: pip install Flask)
5. Google Chrome Browser (Recommended)

**Installation**
1. Open command prompt.
2. Set working directory to given folder (i.e., where vatic.py file is available).
3. Run command "python vatic.py"
4. Command prompt will display the URL where VAT is running, copy and paste it in Google Chrome browser. 
5. VAT web application will be displayed with options like "choose video", "upload", etc.

**Work Flow**
1. To upload a video user need to click "choose File" button and choose one video file and click "upload" button. user can  
    see progress bar showing the status of uploading video.
2. To tag "Expression" on existing XML file, user need to click "Choose File" and choose corresponding XML file of the 
    video file (i.e both file names should be same).
3. Once video uploaded to the VAT, it will be visible on the browser. 
4. To move on video, user can use any one of following keys on the keyboard "space bar", "Right Arrow" or "Left Arrow".
5. User can choose expression from the drop down list.
6. To "SAVE" the work, user need to click on the "Generate" button. File will be saved in downloads as 
    "<filename>_output.xml".
    
**sample image**
    
    ![img](https://github.com/Hack-NLP/Face-and-emotion-annotation-in-video/blob/master/VAT.JPG)
