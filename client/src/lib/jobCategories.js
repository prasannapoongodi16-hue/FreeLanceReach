export const jobCategoryGroups = [
  {
    label: 'Technology & data',
    categories: [
      { value: 'software_developer', label: 'Software Developer' },
      { value: 'web_developer', label: 'Web Developer' },
      { value: 'mobile_app_developer', label: 'Mobile App Developer' },
      { value: 'data_analyst', label: 'Data Analyst' },
      { value: 'it_support', label: 'IT Support' },
      { value: 'qa_tester', label: 'QA Tester' },
    ],
  },
  {
    label: 'Design & media',
    categories: [
      { value: 'graphic_designer', label: 'Graphic Designer' },
      { value: 'ui_ux_designer', label: 'UI/UX Designer' },
      { value: 'web_designer', label: 'Web Designer' },
      { value: 'illustrator', label: 'Illustrator' },
      { value: 'photographer', label: 'Photographer' },
      { value: 'video_editor', label: 'Video Editor' },
    ],
  },
  {
    label: 'Marketing & writing',
    categories: [
      { value: 'content_writer', label: 'Content Writer' },
      { value: 'copywriter', label: 'Copywriter' },
      { value: 'digital_marketer', label: 'Digital Marketer' },
      { value: 'seo_specialist', label: 'SEO Specialist' },
      { value: 'social_media_manager', label: 'Social Media Manager' },
      { value: 'translator', label: 'Translator' },
    ],
  },
  {
    label: 'Business & learning',
    categories: [
      { value: 'virtual_assistant', label: 'Virtual Assistant' },
      { value: 'accountant', label: 'Accountant' },
      { value: 'consultant', label: 'Consultant' },
      { value: 'business_coach', label: 'Business Coach' },
      { value: 'tutor', label: 'Tutor' },
      { value: 'project_manager', label: 'Project Manager' },
    ],
  },
  {
    label: 'Trades & local services',
    categories: [
      { value: 'painter', label: 'Painter' },
      { value: 'electrician', label: 'Electrician' },
      { value: 'plumber', label: 'Plumber' },
      { value: 'carpenter', label: 'Carpenter' },
      { value: 'cleaner', label: 'Cleaner' },
      { value: 'mechanic', label: 'Mechanic' },
      { value: 'landscaper', label: 'Landscaper' },
    ],
  },
]

export const jobCategories = jobCategoryGroups.flatMap((group) => group.categories)
