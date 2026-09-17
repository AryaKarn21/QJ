
import { Download } from 'lucide-react';

const ApplicantProfile = () => {
  const profile = {
    name: 'Ram Bahadur',
    email: 'rambahadur@gmail.com',
    phone: '+977-9800000000',
    address: 'Maitidevi, Kathmandu, Nepal',
    appliedFor: 'Senior UI/UX Designer',
    education: [
      {
        degree: 'B.Sc. Computer Science',
        institution: 'Tribhuvan University',
        year: '2018-2022'
      },
      {
        degree: '+2 Science',
        institution: 'St. Xavier\'s College',
        year: '2016-2018'
      }
    ],
    experience: [
      {
        title: 'UI/UX Designer',
        company: 'TechNepal',
        period: 'Jun 2022-Present',
        description: 'Designed and optimized fintech applications for 350K+ users and collaborated with product teams.'
      },
      {
        title: 'Design Intern',
        company: 'CodeNepal',
        period: '2020-2021',
        description: 'Worked on mobile experiences, assisted in design QA and handled fixes.'
      }
    ],
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Figma', 'User Testing', 'Design Systems'],
    status: 'Shortlisted',
    interview: {
      scheduled: true,
      date: 'April 14, 2025 at 11:00 AM',
      platform: 'Google Meet'
    },
    notes: 'Excellent portfolio and communication skills. Confident and detail-oriented.'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold mb-1">📋 Personal Info</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-gray-600">Name:</p>
                <p className="font-medium">{profile.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Email:</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone:</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
              <div>
                <p className="text-gray-600">Address:</p>
                <p className="font-medium">{profile.address}</p>
              </div>
              <div>
                <p className="text-gray-600">Applied For:</p>
                <p className="font-medium">{profile.appliedFor}</p>
              </div>
            </div>
          </div>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎓 Education</h2>
            <div className="space-y-4">
              {profile.education.map((edu, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{edu.degree}</p>
                    <p className="text-gray-600">{edu.institution}</p>
                  </div>
                  <p className="text-gray-600">{edu.year}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">💼 Experience</h2>
            <div className="space-y-6">
              {profile.experience.map((exp, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{exp.title}</p>
                      <p className="text-gray-600">{exp.company}</p>
                    </div>
                    <p className="text-gray-600">{exp.period}</p>
                  </div>
                  <p className="text-gray-600">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🛠 Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 rounded-full text-gray-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📄 Resume & Cover Letter</h2>
            <button className="flex items-center text-primary hover:text-primary/80">
              <Download size={20} className="mr-2" />
              Download Resume
            </button>
          </div>

          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Interview & Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600">Status:</p>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                  {profile.status}
                </span>
              </div>
              {profile.interview.scheduled && (
                <div>
                  <p className="text-gray-600">Interview:</p>
                  <p>Scheduled - {profile.interview.date}</p>
                  <p className="text-gray-600">
                    Platform: {profile.interview.platform}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">📝 Notes</h2>
            <p className="text-gray-600">{profile.notes}</p>
          </div>

          <div className="mt-6 flex justify-between">
            <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
              Schedule Interview
            </button>
            <div className="space-x-4">
              <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Reject
              </button>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Hire
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantProfile;