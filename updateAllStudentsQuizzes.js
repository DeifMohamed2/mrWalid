const mongoose = require('mongoose');
const User = require('./models/User');
const Quiz = require('./models/Quiz');

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

// Main function to update all students' quizesInfo
async function updateAllStudentsQuizzesInfo() {
  try {
    // Connect to the database
    await connectDB();

    // Get all quizzes grouped by grade
    const quizzes = await Quiz.find({}).lean();
    
    // Group quizzes by grade
    const quizzesByGrade = {
      'Grade1': quizzes.filter(q => q.Grade === 'Grade1'),
      'Grade2': quizzes.filter(q => q.Grade === 'Grade2'),
      'Grade3': quizzes.filter(q => q.Grade === 'Grade3')
    };

    console.log('Quizzes found by grade:');
    Object.entries(quizzesByGrade).forEach(([grade, quizs]) => {
      console.log(`${grade}: ${quizs.length} quizzes`);
    });

    // Process each grade
    for (const [grade, gradeQuizzes] of Object.entries(quizzesByGrade)) {
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
        
        // Create a set of existing quiz IDs to avoid duplicates
        const existingQuizIds = new Set(
          student.quizesInfo.map(quiz => quiz._id.toString())
        );
        
        // Track new quizzes added
        let newQuizzesAdded = 0;
        
        // Process each quiz for this grade
        for (const quiz of gradeQuizzes) {
          const quizId = quiz._id.toString();
          
          // If student doesn't have this quiz in quizesInfo, add it
          if (!existingQuizIds.has(quizId)) {
            student.quizesInfo.push({
              _id: quiz._id,
              quizName: quiz.quizName,
              chapterId: quiz.chapterId,
              isEnterd: false,
              inProgress: false,
              Score: 0,
              answers: [],
              randomQuestionIndices: [],
              quizPurchaseStatus: false,
              purchaseDate: null,
              purchaseCode: null,
              startTime: null,
              endTime: null,
              solvedAt: null
            });
            
            existingQuizIds.add(quizId);
            newQuizzesAdded++;
          }
        }
        
        if (newQuizzesAdded > 0) {
          // Save the updated student
          await student.save();
          console.log(`  Added ${newQuizzesAdded} new quizzes to student's quizesInfo`);
        } else {
          console.log(`  No new quizzes needed for this student`);
        }
      }
    }

    console.log('\nUpdate complete! All students have been updated with quizzes.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating students:', error);
    process.exit(1);
  }
}

// Run the update function
updateAllStudentsQuizzesInfo();
