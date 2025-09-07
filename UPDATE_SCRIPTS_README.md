# Student Data Update Scripts

This folder contains scripts to update student data in the Elshahd platform, specifically to ensure all students have access to the appropriate videos and quizzes for their grade level.

## Problem Solved

These scripts address the following issues:
1. Some students have incomplete `videosInfo` arrays (e.g., only 2 videos when there should be 10)
2. Students cannot access all content in their chapters
3. New students need to be properly initialized with all relevant content

## Available Scripts

### 1. Update All Students' Videos

This script updates all students across all grades to ensure they have entries in their `videosInfo` array for all videos in chapters matching their grade.

```bash
node updateAllStudentsVideos.js
```

### 2. Update Grade 1 Students' Videos

This script specifically updates Grade 1 students to ensure they have entries for all videos in the "كورس أغسطس الصف الأول االثانوي" chapter.

```bash
node updateGrade1Videos.js
```

### 3. Update All Students' Quizzes

This script updates all students across all grades to ensure they have entries in their `quizesInfo` array for all quizzes matching their grade.

```bash
node updateAllStudentsQuizzes.js
```

## System Improvements

In addition to these scripts, the following improvements have been made to the registration system:

1. **Better Video Initialization**: New students now automatically get entries in their `videosInfo` array for all videos in chapters matching their grade.

2. **Better Quiz Initialization**: New students now automatically get entries in their `quizesInfo` array for all quizzes matching their grade.

These changes eliminate the need to copy data from template users and ensure all students have consistent access to their grade's content.

## When to Run These Scripts

Run these scripts in the following situations:

1. After adding new content (videos or quizzes) to ensure all existing students get access
2. If you notice students are missing access to content they should have
3. After a system migration or database update

## Important Notes

- These scripts are safe to run multiple times as they check for existing entries before adding new ones
- Running the scripts does not grant students payment access - it only ensures the proper entries exist in their data
- The scripts will output detailed logs of what changes were made

## Recommended Approach for New Content

When adding new content to the platform:

1. Add the content (videos, quizzes) to the appropriate chapters
2. Run the update scripts to ensure all students get access to the new content
3. Monitor student access to verify everything is working correctly
