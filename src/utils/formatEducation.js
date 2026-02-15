// Shared formatter: converts snake_case education values to properly capitalized labels
const educationMap = {
  'high_school': 'High School',
  'undergrad_freshman': 'Undergrad - Freshman',
  'undergrad_sophomore': 'Undergrad - Sophomore',
  'undergrad_junior': 'Undergrad - Junior',
  'undergrad_senior': 'Undergrad - Senior',
  'graduate': 'Graduate Student',
  'bootcamp': 'Bootcamp Graduate',
  'self_taught': 'Self-Taught',
  'full_time': 'Full-Time Professional'
};

export function formatEducation(value) {
  if (!value) return '';
  return educationMap[value] || value.replace(/_/g, ' ');
}
