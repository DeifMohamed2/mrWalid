const mongoose = require('mongoose');
const User = require('./models/User');
const Chapter = require('./models/Chapter');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/elshahd', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

// Main function to update Grade 1 students' videosInfo
async function updateGrade1StudentsVideosInfo() {
  try {
    // Connect to the database
    await connectDB();

    // Find the target chapter
    const chapter = await Chapter.findOne({
      chapterName: "كورس أغسطس الصف الأول االثانوي",
      chapterGrade: "Grade1"
    });

    if (!chapter) {
      console.error('Chapter not found');
      process.exit(1);
    }

    console.log(`Found chapter: ${chapter.chapterName}`);
    console.log(`Number of lectures: ${chapter.chapterLectures.length}`);

    // Get all videos from the chapter
    const allVideos = [
      ...(chapter.chapterLectures || []),
      ...(chapter.chapterSummaries || []),
      ...(chapter.chapterSolvings || [])
    ];

    console.log(`Total videos in chapter: ${allVideos.length}`);

    // Find all Grade 1 students
    const grade1Students = await User.find({
      Grade: 'Grade1',
      isTeacher: false
    });

    console.log(`Found ${grade1Students.length} Grade 1 students`);

    // Counter for updated students
    let updatedCount = 0;

    // Process each student
    for (const student of grade1Students) {
      // Create a set of existing video IDs to avoid duplicates
      const existingVideoIds = new Set(
        student.videosInfo.map(video => video._id.toString())
      );

      // Create array for new videos to add
      const newVideosToAdd = [];

      // Check each video in the chapter and add if missing
      for (const video of allVideos) {
        const videoId = video._id.toString();
        
        // If student doesn't have this video in videosInfo, add it
        if (!existingVideoIds.has(videoId)) {
          newVideosToAdd.push({
            _id: video._id,
            videoName: video.videoName || video.lectureName,
            chapterId: chapter._id,
            videoType: video.videoType || 'lecture',
            fristWatch: null,
            lastWatch: null,
            videoAllowedAttemps: 3,
            numberOfWatches: 0,
            videoPurchaseStatus: false,
            purchaseDate: null,
            purchaseCode: null,
            isUserEnterQuiz: false,
            isHWIsUploaded: false,
            isUserUploadPerviousHWAndApproved: false,
            prerequisites: video.prerequisites || 'none',
            accessibleAfterViewing: null
          });
        }
      }

      // If there are new videos to add, update the student
      if (newVideosToAdd.length > 0) {
        // Add new videos to student's videosInfo
        student.videosInfo = [...student.videosInfo, ...newVideosToAdd];
        
        // Save the updated student
        await student.save();
        
        updatedCount++;
        console.log(`Updated student ${student.Username} (Code: ${student.Code}) - Added ${newVideosToAdd.length} videos`);
      }
    }

    console.log(`\nUpdate complete! Updated ${updatedCount} students.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating students:', error);
    process.exit(1);
  }
}

// Run the update function
updateGrade1StudentsVideosInfo();
