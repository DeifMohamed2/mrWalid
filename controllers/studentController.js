const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Chapter = require('../models/Chapter');
const Code = require('../models/Code');
const mongoose = require('mongoose');

const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWTSECRET;

const Excel = require('exceljs');
const PDFDocument = require('pdfkit');
const stream = require('stream');

const { v4: uuidv4 } = require('uuid');

// ==================  Dash  ====================== //

const dash_get = async (req, res) => {
  try {

    // await Code.updateMany(
    //   {},
    //   { $set: { codeType: 'Chapter' } }
    // );

    const rankedUsers = await User.find(
      { Grade: req.userData.Grade },
      { Username: 1, userPhoto: 1 }
    )
      .sort({ totalScore: -1 })
      .limit(3);

    res.render('student/dash', {
      title: 'DashBoard',
      path: req.path,
      userData: req.userData,
      rankedUsers: rankedUsers,
    });
  } catch (error) {
    res.send(error.message);
  }
};

// ==================  END Dash  ====================== //

// ==================  Chapter  ====================== //

const chapters_get = async (req, res) => {
  try {
    const chapters = await Chapter.find({
      chapterGrade: req.userData.Grade,
      ARorEN: req.userData.ARorEN,
    }).sort({ createdAt: 1 });
    const paidChapters = chapters.map((chapter) => {
      const isPaid = req.userData.chaptersPaid.includes(chapter._id);
      return { ...chapter.toObject(), isPaid };
    });
    res.render('student/chapters', {
      title: 'Videos',
      path: req.path,
      chapters: paidChapters,
      userData: req.userData,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const buyChapter = async (req, res) => {
  try {
    

    const cahpterId = req.params.cahpterId;
    const code = req.body.code;
    const chapterData = await Chapter.findById(cahpterId, {
      chapterName: 1,
      ischapterNew :1 ,
    });

    let CodeData = null ;
    if(chapterData.ischapterNew){
     CodeData = await Code.findOneAndUpdate(
      { Code: code, isUsed: false, codeType: 'Chapter' ,codeGrade:req.userData.Grade},
      {
        isUsed: true,
        usedBy: req.userData.Code,
        usedIn: chapterData.chapterName,
      },
      { new: true }
    );
  }
  else{ 
      CodeData = await Code.findOneAndUpdate(
      { Code: code, isUsed: false, codeType: 'Chapter'},
      {
        isUsed: true,
        usedBy: req.userData.Code,
        usedIn: chapterData.chapterName,
      },
      { new: true }
    );
  }
    console.log(CodeData);
    if (CodeData) {
      await User.findByIdAndUpdate(req.userData._id, {
        $push: { chaptersPaid: cahpterId },
      });
      res.redirect('/student/videos/lecture/' + cahpterId);
    } else {
      res.redirect('/student/chapters?error=true');
    }
  } catch (error) {
    res.send(error.message);
  }
};

// ================== End Chapter  ====================== //

// ==================  Lecture  ====================== //

const lecture_get = async (req, res) => {
  try {
    const cahpterId = req.params.cahpterId;
    const chapter = await Chapter.findById(cahpterId, {
      chapterLectures: 1,
      chapterAccessibility: 1,
    });
    const isPaid = req.userData.chaptersPaid.includes(cahpterId);
    // console.log(chapter,chapter.chapterAccessibility, isPaid);
    const paidVideos = chapter.chapterLectures.map((lecture) => {
      const isPaid = req.userData.videosPaid.includes(lecture._id);
      const vidoeUser = req.userData.videosInfo.find(
        (video) => video._id == lecture._id
      );
      let videoPrerequisitesName;

      let isUserCanEnter = true;
      if (
        lecture.prerequisites == 'WithExamaAndHw' ||
        lecture.prerequisites == 'WithExam' ||
        lecture.prerequisites == 'WithHw'
      ) {
        const video = req.userData.videosInfo.find(
          (video) => video._id == lecture.AccessibleAfterViewing
        );
        videoPrerequisitesName = video ? video.videoName : null;
        if (lecture.prerequisites == 'WithExamaAndHw') {
          if (
            vidoeUser.isUserEnterQuiz &&
            vidoeUser.isUserUploadPerviousHWAndApproved
          ) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithExam') {
          if (vidoeUser.isUserEnterQuiz) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithHw') {
          if (vidoeUser.isUserUploadPerviousHWAndApproved) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else {
          isUserCanEnter = true;
        }
      }

      return {
        ...lecture,
        isPaid,
        Attemps: vidoeUser?.videoAllowedAttemps ?? 0,
        videoPrerequisitesName: videoPrerequisitesName || null,
        isUserCanEnter: isUserCanEnter,
      };
    });

    console.log(paidVideos);

    if (chapter.chapterAccessibility === 'EnterInFree') {
      res.render('student/videos', {
        title: 'Lecture',
        path: req.path,
        chapterLectures: paidVideos,
        userData: req.userData,
        chapterId: cahpterId,
      });
    } else {
      if (isPaid) {
        res.render('student/videos', {
          title: 'Lecture',
          path: req.path,
          chapterLectures: paidVideos,
          userData: req.userData,
          chapterId: cahpterId,
        });
      } else {
        res.redirect('/student/chapters');
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const sum_get = async (req, res) => {
  try {
    const cahpterId = req.params.cahpterId;
    const chapter = await Chapter.findById(cahpterId, {
      chapterSummaries: 1,
      chapterAccessibility: 1,
    });
    const isPaid = req.userData.chaptersPaid.includes(cahpterId);
    // console.log(chapter,chapter.chapterAccessibility, isPaid);
    const paidVideos = chapter.chapterSummaries.map((lecture) => {
      const isPaid = req.userData.videosPaid.includes(lecture._id);
      const vidoeUser = req.userData.videosInfo.find(
        (video) => video._id == lecture._id
      );
      let videoPrerequisitesName;

      let isUserCanEnter = true;
      if (
        lecture.prerequisites == 'WithExamaAndHw' ||
        lecture.prerequisites == 'WithExam' ||
        lecture.prerequisites == 'WithHw'
      ) {
        const video = req.userData.videosInfo.find(
          (video) => video._id == lecture.AccessibleAfterViewing
        );
        videoPrerequisitesName = video ? video.videoName : null;
        if (lecture.prerequisites == 'WithExamaAndHw') {
          if (
            vidoeUser.isUserEnterQuiz &&
            vidoeUser.isUserUploadPerviousHWAndApproved
          ) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithExam') {
          if (vidoeUser.isUserEnterQuiz) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithHw') {
          if (vidoeUser.isUserUploadPerviousHWAndApproved) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else {
          isUserCanEnter = true;
        }
      }

      return {
        ...lecture,
        isPaid,
        Attemps: vidoeUser?.videoAllowedAttemps ?? 0,
        videoPrerequisitesName: videoPrerequisitesName || null,
        isUserCanEnter: isUserCanEnter,
      };
    });

    console.log(paidVideos);

    if (chapter.chapterAccessibility === 'EnterInFree') {
      res.render('student/videos', {
        title: 'Lecture',
        path: req.path,
        chapterLectures: paidVideos,
        userData: req.userData,
        chapterId: cahpterId,
      });
    } else {
      if (isPaid) {
        res.render('student/videos', {
          title: 'Lecture',
          path: req.path,
          chapterLectures: paidVideos,
          userData: req.userData,
          chapterId: cahpterId,
        });
      } else {
        res.redirect('/student/chapters');
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const solv_get = async (req, res) => {
  try {
    const cahpterId = req.params.cahpterId;
    const chapter = await Chapter.findById(cahpterId, {
      chapterSolvings: 1,
      chapterAccessibility: 1,
    });
    const isPaid = req.userData.chaptersPaid.includes(cahpterId);
    // console.log(chapter,chapter.chapterAccessibility, isPaid);
    const paidVideos = chapter.chapterSolvings.map((lecture) => {
      const isPaid = req.userData.videosPaid.includes(lecture._id);
      const vidoeUser = req.userData.videosInfo.find(
        (video) => video._id == lecture._id
      );
      let videoPrerequisitesName;

      let isUserCanEnter = true;
      if (
        lecture.prerequisites == 'WithExamaAndHw' ||
        lecture.prerequisites == 'WithExam' ||
        lecture.prerequisites == 'WithHw'
      ) {
        const video = req.userData.videosInfo.find(
          (video) => video._id == lecture.AccessibleAfterViewing
        );
        videoPrerequisitesName = video ? video.videoName : null;
        if (lecture.prerequisites == 'WithExamaAndHw') {
          if (
            vidoeUser.isUserEnterQuiz &&
            vidoeUser.isUserUploadPerviousHWAndApproved
          ) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithExam') {
          if (vidoeUser.isUserEnterQuiz) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else if (lecture.prerequisites == 'WithHw') {
          if (vidoeUser.isUserUploadPerviousHWAndApproved) {
            isUserCanEnter = true;
          } else {
            isUserCanEnter = false;
          }
        } else {
          isUserCanEnter = true;
        }
      }

      return {
        ...lecture,
        isPaid,
        Attemps: vidoeUser?.videoAllowedAttemps ?? 0,
        videoPrerequisitesName: videoPrerequisitesName || null,
        isUserCanEnter: isUserCanEnter,
      };
    });

    console.log(paidVideos);

    if (chapter.chapterAccessibility === 'EnterInFree') {
      res.render('student/videos', {
        title: 'Lecture',
        path: req.path,
        chapterLectures: paidVideos,
        userData: req.userData,
        chapterId: cahpterId,
      });
    } else {
      if (isPaid) {
        res.render('student/videos', {
          title: 'Lecture',
          path: req.path,
          chapterLectures: paidVideos,
          userData: req.userData,
          chapterId: cahpterId,
        });
      } else {
        res.redirect('/student/chapters');
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};


// const getVideos = async (req, res) => {
// //   try {
// //     const { cahpterId } = req.params;

// //     // Fetch the chapter with the required fields
// //     const chapter = await Chapter.findById(cahpterId, {
// //       chapterLectures: 1,
// //       chapterSummaries: 1,
// //       chapterSolvings: 1,
// //       chapterAccessibility: 1,
// //     });

// //     if (!chapter) {
// //       return res.status(404).send('Chapter not found');
// //     }

// //     const isPaid = req.userData.chaptersPaid.includes(cahpterId);

// //     // Combine all videos into a single array
// //     const allVideos = [
// //       ...(chapter.chapterLectures || []),
// //       ...(chapter.chapterSummaries || []),
// //       ...(chapter.chapterSolvings || []),
// //     ];

// //     // Sort videos by creation date (oldest to newest)
// //     allVideos.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// //     // Process videos to include additional data
// //     const processedVideos = allVideos.map((video) => {
// //       const isPaidVideo = req.userData.videosPaid.includes(video._id);
// //       const videoUser = req.userData.videosInfo.find((v) => v._id == video._id);
// //       let videoPrerequisitesName = null;
// //       let isUserCanEnter = true;

// //       // Handle prerequisites logic
// //       if (
// //         video.prerequisites === 'WithExamaAndHw' ||
// //         video.prerequisites === 'WithExam' ||
// //         video.prerequisites === 'WithHw'
// //       ) {
// //         const prerequisiteVideo = req.userData.videosInfo.find(
// //           (v) => v._id == video.AccessibleAfterViewing
// //         );
// //         videoPrerequisitesName = prerequisiteVideo
// //           ? prerequisiteVideo.videoName
// //           : null;

// //         if (video.prerequisites === 'WithExamaAndHw') {
// //           isUserCanEnter =
// //             videoUser?.isUserEnterQuiz &&
// //             videoUser?.isUserUploadPerviousHWAndApproved;
// //         } else if (video.prerequisites === 'WithExam') {
// //           isUserCanEnter = videoUser?.isUserEnterQuiz;
// //         } else if (video.prerequisites === 'WithHw') {
// //           isUserCanEnter = videoUser?.isUserUploadPerviousHWAndApproved;
// //         }
// //       }

// //       return {
// //         ...video, // No need for .toObject() since video is already a plain object
// //         isPaid: isPaidVideo,
// //         Attemps: videoUser?.videoAllowedAttemps ?? 0,
// //         videoPrerequisitesName,
// //         isUserCanEnter,
// //         videoType: video.videoType || 'lecture', // Add a type field to distinguish between video types
// //       };
// //     });
// //     console.log(processedVideos);

// //     // Check chapter accessibility
// //     if (chapter.chapterAccessibility === 'EnterInFree' || isPaid) {
// //       res.render('student/videos', {
// //         title: 'Videos',
// //         path: req.path,
// //         chapterVideos: processedVideos, // Pass all videos to the template
// //         userData: req.userData,
// //         chapterId: cahpterId,
// //       });
// //     } else {
// //       res.redirect('/student/chapters');
// //     }
// //   } catch (error) {
// //     console.error('Error fetching videos:', error.message);
// //     res.status(500).send('Internal Server Error');
// //   }
// // };


const buyVideo = async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const code = req.body.code;
    console.log(videoId, code);

    // Update Code document
    // Update Code document
    const CodeData = await Code.findOneAndUpdate(
      { Code: code, isUsed: false },
      { isUsed: true, usedBy: req.userData.Code },
      { new: true }
    );

    if (CodeData) {
      // Check if the videoId exists in videosInfo array before updating
      const user = await User.findOne({
        _id: req.userData._id,
        'videosInfo._id': videoId,
      });
      if (user) {
        // Update User document
        await User.findOneAndUpdate(
          { _id: req.userData._id, 'videosInfo._id': videoId },
          {
            $push: { videosPaid: videoId },
            $inc: { totalSubscribed: 1 },
            $set: { 'videosInfo.$.videoPurchaseStatus': true },
          }
        );
        res.status(204).send();
      } else {
        res.status(301).send();
      }
    } else {
      res.status(301).send();
    }
  } catch (error) {
    res.send(error.message);
  }
};

// ================== End Lecture  ====================== //

// ==================  Watch  ====================== //
async function updateWatchInUser(req, res, videoId, chapterID) {
  const videoInfo = req.userData.videosInfo.find(
    (video) => video._id.toString() === videoId.toString()
  );
  console.log(videoInfo);
  const c = 1;

  if (videoInfo.videoAllowedAttemps <= 0) {
    return res.redirect('/student/videos/lecture/' + chapterID);
  }
  if (!videoInfo.fristWatch) {
    await User.findOneAndUpdate(
      { _id: req.userData._id, 'videosInfo._id': videoId },
      {
        $set: {
          'videosInfo.$.fristWatch': Date.now(),
          'videosInfo.$.lastWatch': Date.now(),
        },
        $inc: {
          // Decrementing the values of videoAllowedAttemps and numberOfWatches
          'videosInfo.$.videoAllowedAttemps': -c,
          'videosInfo.$.numberOfWatches': +c,
        },
      }
    );
  } else {
    await User.findOneAndUpdate(
      { _id: req.userData._id, 'videosInfo._id': videoId },
      {
        $set: {
          'videosInfo.$.lastWatch': Date.now(),
        },
        $inc: {
          // Decrementing the values of videoAllowedAttemps and numberOfWatches
          'videosInfo.$.videoAllowedAttemps': -c,
          'videosInfo.$.numberOfWatches': +c,
        },
      }
    );
  }
}
async function getVideoWatch(req, res) {
  const videoType = req.params.videoType;
  const chapterID = req.params.chapterID;
  const VideoId = req.params.VideoId;

  const chapter = await Chapter.findById(chapterID, {
    chapterLectures: 1,
    chapterSummaries: 1,
    chapterSolvings: 1,
  });
  if (videoType == 'lecture') {
    const video = chapter.chapterLectures.find((video) => video._id == VideoId);
    const isPaid = req.userData.videosPaid.includes(VideoId);
    if (video.paymentStatus == 'Pay') {
      if (isPaid) {
        updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
          res.render('student/watch', {
            title: 'Watch',
            path: req.path,
            video: video,
            userData: req.userData,
          });
        });
      } else {
        res.redirect('/student/videos/lecture/' + chapterID);
      }
    } else {
      updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
        res.render('student/watch', {
          title: 'Watch',
          path: req.path,
          video: video,
          userData: req.userData,
        });
      });
    }
  } else if (videoType == 'summaries') {
    const video = chapter.chapterSummaries.find(
      (video) => video._id == VideoId
    );
    const isPaid = req.userData.videosPaid.includes(VideoId);
    if (video.paymentStatus == 'Pay') {
      if (isPaid) {
        updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
          res.render('student/watch', {
            title: 'Watch',
            path: req.path,
            video: video,
            userData: req.userData,
          });
        });
      } else {
        res.redirect('/student/videos/summaries/' + chapterID);
      }
    } else {
      updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
        res.render('student/watch', {
          title: 'Watch',
          path: req.path,
          video: video,
          userData: req.userData,
        });
      });
    }
  } else if (videoType == 'Solving') {
    const video = chapter.chapterSolvings.find((video) => video._id == VideoId);
    const isPaid = req.userData.videosPaid.includes(VideoId);
    if (video.paymentStatus == 'Pay') {
      if (isPaid) {
        updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
          res.render('student/watch', {
            title: 'Watch',
            path: req.path,
            video: video,
            userData: req.userData,
          });
        });
      } else {
        res.redirect('/student/videos/Solving/' + chapterID);
      }
    } else {
      updateWatchInUser(req, res, VideoId, chapterID).then((result) => {
        res.render('student/watch', {
          title: 'Watch',
          path: req.path,
          video: video,
          userData: req.userData,
        });
      });
    }
  }
}

const watch_get = async (req, res) => {
  try {
    await getVideoWatch(req, res);
  } catch (error) {
    res.send(error.message);
  }
};

const uploadHW = async (req, res) => {
  try {
    const VideoId = req.params.VideoId;
    const userId = req.userData._id;

    // Update the specific video's isHWIsUploaded field
    await User.findOneAndUpdate(
      { _id: userId, 'videosInfo._id': VideoId },
      { $set: { 'videosInfo.$.isHWIsUploaded': true } }
    );

    // Optionally, you can call getVideoWatch after updating the field
    await getVideoWatch(req, res);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// ================== END Watch  ====================== //

// ================== Ranking  ====================== //

const ranking_get = async (req, res) => {
  try {
    const { searchInput } = req.query;
    let perPage = 20;
    let page = req.query.page || 1;

    if (searchInput) {
      // Find the student with the given Code
      const student = await User.findOne({ Code: searchInput }).exec();

      // Find all students and sort them by totalScore
      const allStudents = await User.find(
        {},
        { Username: 1, Code: 1, totalScore: 1 }
      ).sort({ totalScore: -1 });

      // Find the index of the student in the sorted array
      const userRank =
        allStudents.findIndex((s) => s.Code === +searchInput) + 1;
      console.log(userRank);
      const paginatedStudents = await User.find(
        { Code: searchInput },
        { Username: 1, Code: 1, totalScore: 1 }
      ).sort({ totalScore: -1 });

      const count = await User.countDocuments({});

      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);
      const hasPreviousPage = page > 1;

      res.render('student/ranking', {
        title: 'Ranking',
        path: req.path,
        isSearching: true,
        userData: req.userData,
        rankedUsers: paginatedStudents,
        nextPage: hasNextPage ? nextPage : null,
        previousPage: hasPreviousPage ? page - 1 : null,
        userRank: userRank, // Include user's rank in the response
      });

      return;
    } else {
      await User.find(
        { Grade: req.userData.Grade },
        { Username: 1, Code: 1, totalScore: 1 }
      )
        .sort({ totalScore: -1 })
        .then(async (result) => {
          const count = await Code.countDocuments({});
          const nextPage = parseInt(page) + 1;
          const hasNextPage = nextPage <= Math.ceil(count / perPage);
          const hasPreviousPage = page > 1;

          res.render('student/ranking', {
            title: 'Ranking',
            path: req.path,
            userData: req.userData,
            rankedUsers: result,
            nextPage: hasNextPage ? nextPage : null,
            previousPage: hasPreviousPage ? page - 1 : null,
            userRank: null,
            isSearching: false,
          });
        })
        .catch((err) => {
          console.log(err);
        });
      return;
    }
  } catch (error) {
    console.log();
  }
};

// ================== END Ranking  ====================== //

// ================== Exams  ====================== //

// ================== Exams  ====================== //
const exams_get = async (req, res) => {
  try {
    // Get the top 3 ranked users by total score
    const rankedUsers = await User.find(
      { Grade: req.userData.Grade },
      { Username: 1, userPhoto: 1 }
    )
      .sort({ totalScore: -1 })
      .limit(3);

    // Get all exams for the user's grade
    const exams = await Quiz.find({ Grade: req.userData.Grade }).sort({
      createdAt: 1,
    });

    // Map through the exams and add additional information
    const paidExams = await Promise.all(
      exams.map(async (exam) => {
        const isPaid = req.userData.examsPaid.includes(exam._id);
        const quizUser = req.userData.quizesInfo.find(
          (quiz) => quiz._id.toString() === exam._id.toString()
        );

        // Get all user scores for the current quiz
        const users = await User.find({
          Grade: req.userData.Grade,
          'quizesInfo._id': exam._id,
        }).select('quizesInfo.$');

        // Extract and sort the scores
        const userScores = users
          .map((user) => ({
            userId: user._id,
            score: user.quizesInfo[0].Score,
          }))
          .sort((a, b) => b.score - a.score);

        // Find the rank of the current user
        const userRank =
          userScores.findIndex(
            (result) => result.userId.toString() === req.userData._id.toString()
          ) + 1;

        const quizInfo = quizUser
          ? {
              isEnterd: quizUser.isEnterd,
              inProgress: quizUser.inProgress,
              Score: quizUser.Score,
              answers: quizUser.answers,
              rank: userRank, // Add user rank here
              lengthOfUsersTakesQuiz: userScores.length, // Add total number of users who took the quiz
              // Add other properties you want to include
            }
          : null;

        return { ...exam.toObject(), isPaid, quizUser: quizInfo };
      })
    );

    res.render('student/exams', {
      title: 'Exams',
      path: req.path,
      userData: req.userData,
      rankedUsers,
      exams: paidExams,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const buyQuiz = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const code = req.body.code;
    const quizObectId = new mongoose.Types.ObjectId(quizId);
    console.log(quizId, quizObectId);
    const CodeData = await Code.findOneAndUpdate(
      { Code: code, codeType: 'Quiz', isUsed: false, codeFor: quizId },
      { isUsed: true, usedBy: req.userData.Code },
      { new: true }
    );
    if (CodeData) {
      console.log(req.userData._id);

      await User.findOneAndUpdate(
        { _id: req.userData._id, 'quizesInfo._id': quizObectId },
        {
          $push: { examsPaid: quizId },
          $set: { 'quizesInfo.$.quizPurchaseStatus': true },
        }
      );

      res.redirect('/student/exams');
    } else {
      res.redirect('/student/exams?error=true');
    }
  } catch (error) {
    res.redirect('/student/exams?error=true');
  }
};
// ================== END Exams  ====================== //

// ================== quiz  ====================== //
const quiz_get = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quiz = await Quiz.findById(quizId);
    const quizUser = req.userData.quizesInfo.find(
      (q) => q._id.toString() === quiz._id.toString()
    );

    console.log(quiz, quizUser);
    if (!quiz) {
      return res.redirect('/student/exams');
    }

    if (
      !quizUser ||
      !quiz.permissionToShow ||
      !quiz.isQuizActive ||
      (quizUser.isEnterd && !quizUser.inProgress)
    ) {
      return res.redirect('/student/exams');
    }

    const isPaid = req.userData.examsPaid.includes(quizId);
    if (quiz.prepaidStatus && !isPaid) {
      return res.redirect('/student/exams');
    }

    res.render('student/quiz', {
      title: 'Quiz',
      path: req.path,
      quiz: quiz,
      userData: req.userData,
      question: null,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const quizWillStart = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quiz = await Quiz.findById(quizId);
    const quizUser = req.userData.quizesInfo.find(
      (q) => q._id.toString() === quiz._id.toString()
    );

    const durationInMinutes = quiz.timeOfQuiz;

    const endTime = new Date(Date.now() + durationInMinutes * 60000);
    console.log(endTime, durationInMinutes);
    if (!quizUser.endTime) {
      console.log(endTime, durationInMinutes);
      await User.findOneAndUpdate(
        { _id: req.userData._id, 'quizesInfo._id': quiz._id },
        {
          $set: {
            'quizesInfo.$.endTime': endTime,
            'quizesInfo.$.inProgress': true,
          },
        }
      ).then((result) => {
        res.redirect(`/student/quizStart/${quizId}?qNumber=1`);
      });
    } else {
      res.redirect(`/student/quizStart/${quizId}?qNumber=1`);
    }
  } catch (error) {
    res.send(error.message);
  }
};

const escapeSpecialCharacters = (text) => {
  try {
    // Attempt to parse the JSON string
    const parsedText = JSON.parse(text);
    // If parsing succeeds, stringify it back and escape special characters
    const escapedText = JSON.stringify(parsedText, (key, value) => {
      if (typeof value === 'string') {
        return value.replace(/["\\]/g, '\\$&');
      }
      return value;
    });
    return escapedText;
  } catch (error) {
    // If parsing fails, return the original text
    return text;
  }
};

const quiz_start = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quiz = await Quiz.findById(quizId);
    const userQuizInfo = req.userData.quizesInfo.find(
      (q) => q._id.toString() === quiz._id.toString()
    );

    // Redirect if quiz or user info not found
    if (
      !quiz ||
      !userQuizInfo ||
      !quiz.permissionToShow ||
      !quiz.isQuizActive ||
      (userQuizInfo.isEnterd && !userQuizInfo.inProgress)
    ) {
      return res.redirect('/student/exams');
    }

    // Redirect if user didn't pay for the quiz
    const isPaid = req.userData.examsPaid.includes(quizId);
    if (quiz.prepaidStatus && !isPaid) {
      return res.redirect('/student/exams');
    }

    // Redirect if quiz is not yet started
    if (!userQuizInfo.endTime) {
      return res.redirect('/student/exams');
    }

    // Parse query parameter for question number
    let questionNumber = parseInt(req.query.qNumber) || 1;
    if (questionNumber > quiz.questionsCount) {
      questionNumber = quiz.questionsCount;
      console.log(questionNumber);
    }

    // Find the current question and escape special characters
    const question = quiz.Questions.find(
      (q) => q.qNumber.toString() === questionNumber.toString()
    );

    question.title = escapeSpecialCharacters(question.title);
    question.answer1 = escapeSpecialCharacters(question.answer1);
    question.answer2 = escapeSpecialCharacters(question.answer2);
    question.answer3 = escapeSpecialCharacters(question.answer3);
    question.answer4 = escapeSpecialCharacters(question.answer4);

    res.render('student/quizStart', {
      title: 'Quiz',
      path: req.path,
      quiz,
      userData: req.userData,
      question,
      userQuizInfo,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const quizFinish = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quizObjId = new mongoose.Types.ObjectId(quizId);

    const quiz = await Quiz.findById(quizId);
    const userQuizInfo = req.userData.quizesInfo.find(
      (q) => q._id.toString() === quiz._id.toString()
    );
    const quizData = req.body;
    let answers = quizData.answers;
    const score = quizData.score;

    if (userQuizInfo.isEnterd && !userQuizInfo.inProgress) {
      return res.redirect('/student/exams');
    }

    // Update user's quiz info
    User.findOneAndUpdate(
      { _id: req.userData._id, 'quizesInfo._id': quizObjId },
      {
        $set: {
          'quizesInfo.$.answers': answers,
          'quizesInfo.$.Score': +score,
          'quizesInfo.$.inProgress': false,
          'quizesInfo.$.isEnterd': true,
          'quizesInfo.$.solvedAt': Date.now(),
          'quizesInfo.$.endTime': 0,
        },
        $inc: { totalScore: +score, totalQuestions: +quiz.questionsCount },
      }
    ).then(async (result) => {
      // Check if there's a corresponding video for the quiz in user's videosInfo
      const videoInfo = req.userData.videosInfo.find(
        (video) => video._id === quiz.videoWillbeOpen
      );
      if (videoInfo && !videoInfo.isUserEnterQuiz) {
        // Update the video's entry to mark it as entered by the user
        await User.findOneAndUpdate(
          { _id: req.userData._id, 'videosInfo._id': videoInfo._id },
          { $set: { 'videosInfo.$.isUserEnterQuiz': true } }
        ).then((result) => {
          res.redirect('/student/exams');
        });
      } else {
        res.redirect('/student/exams');
      }
    });
  } catch (error) {
    res.send(error.message);
  }
};

// ================== END quiz  ====================== //

const settings_get = async (req, res) => {
  try {
    res.render('student/settings', {
      title: 'Settings',
      path: req.path,
      userData: req.userData,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const settings_post = async (req, res) => {
  try {
    const { Username, gov, userPhoto } = req.body;
    console.log(Username, gov);
    const user = await User.findByIdAndUpdate(req.userData._id, {
      Username: Username,
      gov: gov,
      userPhoto: userPhoto,
    });

    res.redirect('/student/settings');
  } catch (error) {
    res.send(error.message);
  }
};



// end OF SETTINGS




// ==================  PDFs  ====================== //

const PDFs_get = async (req, res) => {
  try {
    const PDFdata = await PDFs.find({ "pdfGrade": req.userData.Grade }).sort({ createdAt: 1 })
    console.log(PDFdata);

    const PaidPDFs = PDFdata.map(PDF => {
      const isPaid = req.userData.videosPaid.includes(PDF._id);
      return { ...PDF.toObject(), isPaid };
    });
    res.render("student/PDFs", { title: "PDFs", path: req.path, PDFs: PaidPDFs, userData: req.userData });

  } catch (error) {
    res.send(error.message);
  }
}

const getPDF = async (req, res) => {
  try {
    const pdfId = req.params.PDFID;
    const pdf = await PDFs.findById(pdfId);
// Check if pdfsPaid is defined and is an array
  console.log(pdfId);
// Alternatively, you can use a more explicit check
const isPaid = req.userData.videosPaid.includes(pdfId);
console.log(isPaid);
    if (pdf.pdfStatus == "Paid") {
      if (isPaid) {
        res.render("student/ViewPDF", { title: "View PDF", path: req.path, pdf: pdf, userData: req.userData });
      } else {
        res.redirect('/student/PDFs');
      }
    } else {
      res.render("student/ViewPDF", { title: "View PDF", path: req.path, pdf: pdf, userData: req.userData });
    }
  } catch (error) {
    res.send(error.message);
  }
}

const buyPDF = async (req, res) => {
  try {
    const pdfId = req.params.PDFID;
    const code = req.body.code;
   const CodeData =  await Code.findOneAndUpdate({ "Code": code , "isUsed": false , "codeType":"PDF"  }, 
   { "isUsed": true, "usedBy": req.userData.Code }, { new: true });
   if (CodeData) {
    const user=  await User.findByIdAndUpdate(req.userData._id, { $push: { videosPaid: pdfId } });
    console.log(user  )
    res.redirect('/student/PDFs');
   }else{
    res.redirect('/student/PDFs?error=true');
     }
   
   console.log(CodeData);
  } catch (error) {
    res.send(error.message);
  }
};
// ================== END PDFs  ====================== //


// ================== LogOut  ====================== //

const logOut = async (req, res) => {
  // Clearing the token cookie
  res.clearCookie('token');
  // Redirecting to the login page or any other desired page
  res.redirect('../login');
};

// ================== END LogOut  ====================== //

module.exports = {
  dash_get,

  chapters_get,
  buyChapter,
  // getVideos,
  lecture_get,
  sum_get,
  solv_get,
  buyVideo,

  watch_get,
  uploadHW,

  ranking_get,

  exams_get,
  buyQuiz,

  quiz_get,
  quizWillStart,
  quiz_start,
  quizFinish,

  PDFs_get,
  getPDF,
  buyPDF,

  settings_get,
  settings_post,

  logOut,
};
