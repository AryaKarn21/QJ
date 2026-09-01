# Quick Jobs  - API Documentation

## Authentication & Authorization

### Token Requirements
- **Token Required**: Routes marked with 🔐 require JWT token in Authorization header
- **Admin Only**: Routes marked with 👑 require admin role
- **Employer Only**: Routes marked with 🏢 require employer role

### Roles
- `jobseeker` - Default role for job seekers
- `employer` - Role for companies posting jobs
- `admin` - Administrative role with full access

---

## 🔑 User Authentication Routes (`/api/users`)

### POST `/register`
**Purpose**: Register a new user  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 6 chars)",
  "role": "jobseeker|employer|admin (required)",
  
  // Jobseeker specific fields
  "skills": "string (optional)",
  "qualifications": "string (optional)", 
  "experiences": "string (optional)",
  
  // Employer specific fields
  "panNumber": "string (optional)",
  "establishedDate": "date (optional)",
  "industryType": "string (optional)",
  "companySize": "string (optional)",
  "address": "string (optional)",
  "telephone": "string (optional)",
  "description": "string (optional)"
}
```

**Files** (multipart/form-data):
- `profilePic`: Image file (optional)
- `resume`: PDF file (for jobseekers, optional)
- `companyLogo`: Image file (for employers, optional)

**Response**:
```json
{
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "isVerified": false
  }
}
```

### POST `/login`
**Purpose**: User login  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response**:
```json
{
  "token": "jwt_token_string",
  "user": {
    "_id": "string",
    "name": "string", 
    "email": "string",
    "role": "string",
    "isVerified": boolean
  }
}
```

### POST `/verify-otp`
**Purpose**: Verify OTP for email verification  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "email": "string (required)",
  "otpCode": "string (required)"
}
```

**Response**:
```json
{
  "message": "Email verified successfully"
}
```

### POST `/resend-otp`
**Purpose**: Resend OTP for email verification  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "email": "string (required)"
}
```

**Response**:
```json
{
  "message": "OTP sent successfully"
}
```

### POST `/forgot-password`
**Purpose**: Request password reset  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "email": "string (required)"
}
```

**Response**:
```json
{
  "message": "Password reset email sent"
}
```

### POST `/reset-password`
**Purpose**: Reset password with token  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "token": "string (required)",
  "newPassword": "string (required)"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

### POST `/change-password` 🔐
**Purpose**: Change password for authenticated user  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Payload**:
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required)"
}
```

**Response**:
```json
{
  "message": "Password changed successfully"
}
```

---

## 💼 Job Routes (`/api/jobs`)

### GET `/`
**Purpose**: Get all jobs with filtering and pagination  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 6)
- `location`: string (optional)
- `jobtype`: "Full-time"|"Part-time"|"Contract"|"Hourly" (optional)
- `level`: "Internship"|"Fresher"|"Mid Level"|"Senior" (optional)
- `status`: "Active"|"Inactive"|"Closed" (optional)
- `search`: string (optional)

**Response**:
```json
{
  "jobs": [
    {
      "_id": "string",
      "title": "string",
      "location": "string",
      "jobtype": "string",
      "salary": "string",
      "experience": "string",
      "jobcategory": "string",
      "level": "string",
      "deadline": "date",
      "openings": number,
      "istrending": boolean,
      "status": "string",
      "description": "string",
      "employer": {
        "_id": "string",
        "name": "string",
        "companyLogo": "string"
      },
      "likeCount": number,
      "dislikeCount": number,
      "isSaved": boolean
    }
  ],
  "total": number
}
```

### GET `/trending`
**Purpose**: Get trending jobs  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**: Same as GET `/` but filtered for trending jobs

### GET `/recent`
**Purpose**: Get recent jobs  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**: Same as GET `/` but sorted by creation date

### GET `/saved-jobs` 🔐
**Purpose**: Get saved jobs for authenticated user  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "savedJobs": [
    // Job objects array
  ]
}
```

### GET `/applied-jobs` 🔐
**Purpose**: Get applied jobs for authenticated user  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "appliedJobs": [
    {
      "job": {
        // Job object
      },
      "application": {
        "_id": "string",
        "status": "Pending|Reviewed|Accepted|Rejected",
        "createdAt": "date"
      }
    }
  ]
}
```

### POST `/apply` 🔐
**Purpose**: Apply to a job  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Payload** (multipart/form-data):
```json
{
  "jobId": "string (required)",
  "howDidYouHear": "string (optional)",
  "coverLetter": "string (required)"
}
```

**Files**:
- `resume`: PDF file (required)

**Response**:
```json
{
  "message": "Application submitted successfully",
  "application": {
    "_id": "string",
    "job": "string",
    "applicant": "string",
    "status": "Pending"
  }
}
```

### POST `/:id/like` 🔐
**Purpose**: Like a job  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "message": "Job liked successfully"
}
```

### POST `/:id/dislike` 🔐
**Purpose**: Dislike a job  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "message": "Job disliked successfully"
}
```

### PATCH `/:id/save` 🔐
**Purpose**: Save/unsave a job  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "message": "Job saved successfully" // or "Job unsaved successfully"
}
```

### GET `/:id`
**Purpose**: Get job by ID  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "_id": "string",
  "title": "string",
  "location": "string",
  "jobtype": "string",
  "salary": "string",
  "experience": "string",
  "jobcategory": "string",
  "level": "string",
  "deadline": "date",
  "openings": number,
  "istrending": boolean,
  "status": "string",
  "description": "string",
  "employer": {
    // Employer details
  },
  "likeCount": number,
  "dislikeCount": number
}
```

### GET `/:id/views`
**Purpose**: Get job view statistics  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "viewCount": number,
  "views": [
    {
      "ip": "string",
      "date": "date"
    }
  ]
}
```

---

## 👤 Jobseeker Routes (`/api/jobseekers`)

### GET `/profile` 🔐
**Purpose**: Get jobseeker profile  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "profilePic": "string",
  "skills": "string",
  "qualifications": "string",
  "experiences": "string",
  "resume": "string"
}
```

### PUT `/profile` 🔐
**Purpose**: Update jobseeker profile  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Payload** (multipart/form-data):
```json
{
  "name": "string (optional)",
  "skills": "string (optional)",
  "qualifications": "string (optional)",
  "experiences": "string (optional)"
}
```

**Files**:
- `profilePic`: Image file (optional)
- `resume`: PDF file (optional)

**Response**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    // Updated user object
  }
}
```

### GET `/applied-jobs` 🔐
**Purpose**: Get applied jobs for jobseeker  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**: Same as `/api/jobs/applied-jobs`

### GET `/dashboard-stats` 🔐
**Purpose**: Get dashboard statistics for jobseeker  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "totalApplications": number,
  "pendingApplications": number,
  "acceptedApplications": number,
  "rejectedApplications": number
}
```

---

## 🏢 Employer Routes (`/api/employers`)

### GET `/profile` 🔐
**Purpose**: Get employer profile  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "companyLogo": "string",
  "panNumber": "string",
  "establishedDate": "date",
  "industryType": "string",
  "companySize": "string",
  "address": "string",
  "telephone": "string",
  "description": "string",
  "isVerified": boolean
}
```

### PUT `/profile` 🔐
**Purpose**: Update employer profile  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Payload** (multipart/form-data):
```json
{
  "name": "string (optional)",
  "panNumber": "string (optional)",
  "establishedDate": "date (optional)",
  "industryType": "string (optional)",
  "companySize": "string (optional)",
  "address": "string (optional)",
  "telephone": "string (optional)",
  "description": "string (optional)"
}
```

**Files**:
- `companyLogo`: Image file (optional)

**Response**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    // Updated user object
  }
}
```

### POST `/jobs` 🔐🏢
**Purpose**: Create a new job posting  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Payload**:
```json
{
  "title": "string (required)",
  "location": "string (required)",
  "jobtype": "Full-time|Part-time|Contract|Hourly (required)",
  "salary": "string (required)",
  "experience": "string (optional)",
  "jobcategory": "string (required)",
  "level": "Internship|Fresher|Mid Level|Senior (required)",
  "deadline": "date (required)",
  "openings": "number (required, min: 1)",
  "description": "string (required)"
}
```

**Response**:
```json
{
  "message": "Job created successfully",
  "job": {
    "_id": "string",
    "title": "string",
    "location": "string",
    "jobtype": "string",
    "salary": "string",
    "experience": "string",
    "jobcategory": "string",
    "level": "string",
    "deadline": "date",
    "openings": number,
    "status": "Active",
    "description": "string",
    "employer": "string"
  }
}
```

### PUT `/jobs/:jobId` 🔐🏢
**Purpose**: Edit job posting  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Payload**: Same as POST `/jobs`

**Response**:
```json
{
  "message": "Job updated successfully",
  "job": {
    // Updated job object
  }
}
```

### PATCH `/jobs/:jobId` 🔐🏢
**Purpose**: Partially update job posting  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Payload**: Any subset of job fields

**Response**: Same as PUT `/jobs/:jobId`

### DELETE `/jobs/:jobId` 🔐🏢
**Purpose**: Delete job posting  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "message": "Job deleted successfully"
}
```

### GET `/jobs/:jobId/jobseekers` 🔐🏢
**Purpose**: Get jobseekers who applied to a specific job  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "applications": [
    {
      "_id": "string",
      "applicant": {
        "_id": "string",
        "name": "string",
        "email": "string",
        "profilePic": "string"
      },
      "howDidYouHear": "string",
      "coverLetter": "string",
      "resume": "string",
      "status": "Pending|Reviewed|Accepted|Rejected",
      "createdAt": "date"
    }
  ]
}
```

### GET `/my-jobs` 🔐🏢
**Purpose**: Get all jobs posted by employer  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "jobs": [
    // Job objects array
  ]
}
```

### GET `/dashboard-stats` 🔐🏢
**Purpose**: Get dashboard statistics for employer  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "totalJobs": number,
  "activeJobs": number,
  "totalApplications": number,
  "pendingApplications": number
}
```

### GET `/my-jobs/applications` 🔐🏢
**Purpose**: Get all applications for employer's jobs  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "applications": [
    {
      "_id": "string",
      "job": {
        "_id": "string",
        "title": "string"
      },
      "applicant": {
        "_id": "string",
        "name": "string",
        "email": "string"
      },
      "status": "string",
      "createdAt": "date"
    }
  ]
}
```

### GET `/my-jobs/applicants` 🔐🏢
**Purpose**: Get all applicants for employer's jobs  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**: Same as `/my-jobs/applications`

### PATCH `/applications/:applicationId/status` 🔐🏢
**Purpose**: Update application status  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Payload**:
```json
{
  "status": "Pending|Reviewed|Accepted|Rejected (required)"
}
```

**Response**:
```json
{
  "message": "Application status updated successfully",
  "application": {
    "_id": "string",
    "status": "string"
  }
}
```

---

## 👑 Admin Routes (`/api/admin`)

### GET `/profile` 🔐👑
**Purpose**: Get admin profile  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "admin"
}
```

### GET `/admin-stats`
**Purpose**: Get admin dashboard statistics  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "totalJobseekers": number,
  "totalEmployers": number,
  "totalJobs": number,
  "totalApplications": number
}
```

### PATCH `/verify-employer/:id` 🔐👑
**Purpose**: Verify an employer  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "message": "Employer verified successfully"
}
```

### GET `/employer/:employerId/applicants` 🔐👑
**Purpose**: Get all applicants for a specific employer's jobs  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "applications": [
    // Application objects array
  ]
}
```

### PATCH `/applications/:applicationId/status` 🔐👑
**Purpose**: Update application status (admin override)  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Payload**:
```json
{
  "status": "Pending|Reviewed|Accepted|Rejected (required)"
}
```

**Response**:
```json
{
  "message": "Application status updated successfully"
}
```

### GET `/users` 🔐👑
**Purpose**: Get all users  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "users": [
    {
      "_id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "isVerified": boolean,
      "createdAt": "date"
    }
  ]
}
```

### DELETE `/user/:id` 🔐👑
**Purpose**: Delete a user  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "message": "User deleted successfully"
}
```

### GET `/jobs` 🔐👑
**Purpose**: Get all jobs (admin view)  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "jobs": [
    // Job objects array with additional admin fields
  ]
}
```

### PUT `/job/:id` 🔐👑
**Purpose**: Edit any job (admin override)  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Payload**: Same as employer job creation

**Response**:
```json
{
  "message": "Job updated successfully"
}
```

### DELETE `/job/:id` 🔐👑
**Purpose**: Delete any job (admin override)  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "message": "Job deleted successfully"
}
```

### PATCH `/jobs/:id/trending`
**Purpose**: Toggle job trending status  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "message": "Job trending status updated successfully"
}
```

---

## 📊 Insight Routes (`/api/insights`)

### GET `/job-stats` 🔐🏢
**Purpose**: Get job statistics for employer  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "totalJobs": number,
  "totalApplications": number,
  "totalViews": number,
  "conversionRate": number
}
```

### GET `/dashboard-stats` 🔐🏢
**Purpose**: Get dashboard statistics for employer  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "activeJobs": number,
  "totalApplications": number,
  "pendingApplications": number,
  "acceptedApplications": number
}
```

### GET `/conversion-rates` 🔐🏢
**Purpose**: Get job conversion rates  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "viewToApplicationRate": number,
  "applicationToHireRate": number
}
```

### GET `/job-comparison` 🔐🏢
**Purpose**: Get job posting comparison data  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**:
```json
{
  "jobs": [
    {
      "title": "string",
      "applications": number,
      "views": number,
      "conversionRate": number
    }
  ]
}
```

### GET `/all-job-stats` 🔐👑
**Purpose**: Get all job statistics by date (admin only)  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**:
```json
{
  "stats": [
    {
      "date": "date",
      "totalJobs": number,
      "totalApplications": number,
      "totalViews": number
    }
  ]
}
```

---

## 🔔 Notification Routes (`/api/notifications`)

### GET `/jobseeker` 🔐
**Purpose**: Get notifications for jobseeker  
**Token**: ✅ Required  
**Role**: ❌ Any authenticated user  

**Response**:
```json
{
  "notifications": [
    {
      "_id": "string",
      "title": "string",
      "message": "string",
      "type": "string",
      "isRead": boolean,
      "createdAt": "date"
    }
  ]
}
```

### GET `/employer` 🔐🏢
**Purpose**: Get notifications for employer  
**Token**: ✅ Required  
**Role**: 🏢 Employer only  

**Response**: Same as jobseeker notifications

### GET `/admin` 🔐👑
**Purpose**: Get notifications for admin  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Response**: Same as jobseeker notifications

### POST `/announcement` 🔐👑
**Purpose**: Create general announcement  
**Token**: ✅ Required  
**Role**: 👑 Admin only  

**Payload**:
```json
{
  "title": "string (required)",
  "message": "string (required)",
  "targetAudience": "all|jobseekers|employers (required)"
}
```

**Response**:
```json
{
  "message": "Announcement created successfully",
  "announcement": {
    "_id": "string",
    "title": "string",
    "message": "string",
    "targetAudience": "string"
  }
}
```

---

## 💰 Revenue Routes (`/api/revenue`)

### GET `/allemployers`
**Purpose**: Get all employers with job counts  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "employers": [
    {
      "_id": "string",
      "name": "string",
      "jobCount": number
    }
  ]
}
```

### GET `/employer/:employerId/jobs`
**Purpose**: Get jobs by specific employer  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "jobs": [
    // Job objects array
  ]
}
```

### GET `/`
**Purpose**: Get all revenue records  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "revenues": [
    {
      "_id": "string",
      "amount": number,
      "source": "string",
      "date": "date",
      "description": "string"
    }
  ]
}
```

### POST `/`
**Purpose**: Add new revenue record  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**:
```json
{
  "amount": "number (required)",
  "source": "string (required)",
  "description": "string (optional)"
}
```

**Response**:
```json
{
  "message": "Revenue added successfully",
  "revenue": {
    "_id": "string",
    "amount": number,
    "source": "string",
    "date": "date",
    "description": "string"
  }
}
```

### PUT `/:id`
**Purpose**: Edit revenue record  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Payload**: Same as POST `/`

**Response**:
```json
{
  "message": "Revenue updated successfully",
  "revenue": {
    // Updated revenue object
  }
}
```

### DELETE `/:id`
**Purpose**: Delete revenue record  
**Token**: ❌ Not required  
**Role**: ❌ Not required  

**Response**:
```json
{
  "message": "Revenue deleted successfully"
}
```

---

## 🔧 Common Response Formats

### Error Responses
```json
{
  "message": "Error description",
  "error": "Detailed error information (in development)"
}
```

### Success Responses
```json
{
  "message": "Success description",
  "data": {
    // Response data
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📝 Notes

1. **File Uploads**: Routes that accept file uploads use `multipart/form-data` encoding
2. **Authentication**: JWT tokens should be sent in the `Authorization` header as `Bearer <token>`
3. **Pagination**: Most list endpoints support `page` and `limit` query parameters
4. **Filtering**: Job endpoints support various filtering options via query parameters
5. **Role-based Access**: Some routes are restricted to specific user roles
6. **Timestamps**: All models include `createdAt` and `updatedAt` timestamps
