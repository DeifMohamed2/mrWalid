const mongoose = require('mongoose');
const User = require('./models/User');
const Chapter = require('./models/Chapter');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb+srv://deif:1qaz2wsx@3devway.aa4i6ga.mongodb.net/mrWalid?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

// Main function to update all students' videosInfo
async function updateAllStudentsVideosInfo() {
  try {
    // Connect to the database
    await connectDB();

    // Get all chapters grouped by grade
    const chapters = await Chapter.find({}).lean();
    
    // Group chapters by grade
    const chaptersByGrade = {
      'Grade1': chapters.filter(ch => ch.chapterGrade === 'Grade1'),
      'Grade2': chapters.filter(ch => ch.chapterGrade === 'Grade2'),
      'Grade3': chapters.filter(ch => ch.chapterGrade === 'Grade3')
    };

    console.log('Chapters found by grade:');
    Object.entries(chaptersByGrade).forEach(([grade, chaps]) => {
      console.log(`${grade}: ${chaps.length} chapters`);
    });

    // Process each grade
    for (const [grade, gradeChapters] of Object.entries(chaptersByGrade)) {
      console.log(`\nProcessing ${grade}...`);
      
      // Find all students in this grade
      const students = await User.find({
        Grade: grade,
        isTeacher: false
      });
      
      console.log(`Found ${students.length} students in ${grade}`);
      
      // Process each student
      for (const student of students) {
        console.log(`\nUpdating student: ${student.Username} (Code: ${student.Code})`);
        
        // Create a set of existing video IDs to avoid duplicates
        const existingVideoIds = new Set(
          student.videosInfo.map(video => video._id.toString())
        );
        
        // Track new videos added
        let newVideosAdded = 0;
        
        // Process each chapter for this grade
        for (const chapter of gradeChapters) {
          // Get all videos from the chapter
          const allVideos = [
            ...(chapter.chapterLectures || []),
            ...(chapter.chapterSummaries || []),
            ...(chapter.chapterSolvings || [])
          ];
          
          // Check each video in the chapter and add if missing
          for (const video of allVideos) {
            const videoId = video._id.toString();
            
            // If student doesn't have this video in videosInfo, add it
            if (!existingVideoIds.has(videoId)) {
              student.videosInfo.push({
                _id: video._id,
                videoName: video.videoName || video.lectureName,
                chapterId: chapter._id,
                videoType: video.videoType || 'lecture',
                fristWatch: null,
                lastWatch: null,
                videoAllowedAttemps: 10,
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
              
              existingVideoIds.add(videoId);
              newVideosAdded++;
            }
          }
        }
        
        if (newVideosAdded > 0) {
          // Save the updated student
          await student.save();
          console.log(`  Added ${newVideosAdded} new videos to student's videosInfo`);
        } else {
          console.log(`  No new videos needed for this student`);
        }
      }
    }

    console.log('\nUpdate complete! All students have been updated.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating students:', error);
    process.exit(1);
  }
}

// Run the update function
updateAllStudentsVideosInfo();
