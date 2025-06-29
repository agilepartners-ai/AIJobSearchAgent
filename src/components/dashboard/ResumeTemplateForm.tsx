import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setFormData,
  setExpandedSections,
  setFormatChoice,
  setSelectedTemplate,
  resetResumeTemplateForm
} from '../../store/resumeTemplateFormSlice';
import { X, Plus, Minus, User, GraduationCap, Briefcase, Wrench, Rocket, Award, Trophy, Globe, Palette, FileText, Edit, Download } from 'lucide-react';

interface ParsedResume {
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
  };
  education: Array<{
    school: string;
    degree: string;
    field: string;
    gpa: string;
    start_date: string;
    end_date: string;
    location: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    location: string;
    highlights: string[];
  }>;
  skills: string[];
  projects: Array<{
    title: string;
    url: string;
    description: string;
    technologies: string;
  }>;
  certifications: Array<{
    name: string;
    issuing_organization: string;
    issue_date: string;
    expiration_date: string;
  }>;
  awards: Array<{
    title: string;
    issuer: string;
    date_received: string;
    description: string;
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
}

interface ResumeTemplateFormProps {
  parsedResume: ParsedResume;
  onClose: () => void;
  onGenerate: (formData: any) => void;
}

const ResumeTemplateForm: React.FC<ResumeTemplateFormProps> = ({ 
  parsedResume, 
  onClose, 
  onGenerate 
}) => {
  const dispatch = useAppDispatch();
  const formData = useAppSelector((state) => state.resumeTemplateForm.formData);
  const expandedSections = useAppSelector((state) => state.resumeTemplateForm.expandedSections);
  const formatChoice = useAppSelector((state) => state.resumeTemplateForm.formatChoice);
  const selectedTemplate = useAppSelector((state) => state.resumeTemplateForm.selectedTemplate);

  // Mock templates data
  const templates = [
    { id: 'modern', name: 'Modern Professional', preview: '/api/placeholder/200/250' },
    { id: 'classic', name: 'Classic Traditional', preview: '/api/placeholder/200/250' },
    { id: 'creative', name: 'Creative Design', preview: '/api/placeholder/200/250' },
    { id: 'minimal', name: 'Minimal Clean', preview: '/api/placeholder/200/250' }
  ];

  // (Removed duplicate useEffect that caused syntax error)
  // Only initialize form data on first mount, not every time parsedResume changes
  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) {
      dispatch(setFormData({
        personal: parsedResume.personal || {
          name: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          website: ''
        },
        education: parsedResume.education || [{}],
        experience: parsedResume.experience || [{}],
        skills: parsedResume.skills?.join(', ') || '',
        projects: parsedResume.projects || [],
        certifications: parsedResume.certifications || [],
        awards: parsedResume.awards || [],
        languages: parsedResume.languages || []
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSection = (sectionId: string) => {
    let newExpanded: string[] = Array.isArray(expandedSections)
      ? [...expandedSections]
      : Array.from(expandedSections as any);
    if (newExpanded.includes(sectionId)) {
      newExpanded = newExpanded.filter((id) => id !== sectionId);
    } else {
      newExpanded.push(sectionId);
    }
    dispatch(setExpandedSections(newExpanded));
  };

  const addEntry = (section: string) => {
    const newFormData = { ...formData };
    if (!newFormData[section]) {
      newFormData[section] = [];
    }
    const emptyEntry = section === 'education' ? {
      school: '', degree: '', field: '', gpa: '', start_date: '', end_date: '', location: ''
    } : section === 'experience' ? {
      company: '', position: '', start_date: '', end_date: '', location: '', highlights: ''
    } : section === 'projects' ? {
      title: '', url: '', description: '', technologies: ''
    } : section === 'certifications' ? {
      name: '', issuing_organization: '', issue_date: '', expiration_date: ''
    } : section === 'awards' ? {
      title: '', issuer: '', date_received: '', description: ''
    } : section === 'languages' ? {
      name: '', proficiency: ''
    } : {};
    newFormData[section].push(emptyEntry);
    dispatch(setFormData(newFormData));
    // Auto-expand section
    let newExpanded: string[] = Array.isArray(expandedSections)
      ? [...expandedSections]
      : Array.from(expandedSections as any);
    if (!newExpanded.includes(section)) {
      newExpanded.push(section);
      dispatch(setExpandedSections(newExpanded));
    }
  };

  const removeEntry = (section: string, index: number) => {
    const newFormData = { ...formData };
    newFormData[section].splice(index, 1);
    dispatch(setFormData(newFormData));
  };

  const updateField = (section: string, field: string, value: string, index?: number) => {
    const newFormData = { ...formData };
    if (index !== undefined) {
      if (!newFormData[section]) newFormData[section] = [];
      if (!newFormData[section][index]) newFormData[section][index] = {};
      newFormData[section][index][field] = value;
    } else if (section === 'personal') {
      newFormData.personal[field] = value;
    } else {
      newFormData[field] = value;
    }
    dispatch(setFormData(newFormData));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      format_choice: formatChoice,
      template: selectedTemplate
    });
    dispatch(resetResumeTemplateForm());
  };

  const SectionHeader = ({ 
    id, 
    icon, 
    title, 
    status, 
    onAdd 
  }: { 
    id: string; 
    icon: React.ReactNode; 
    title: string; 
    status?: 'required' | 'recommended' | 'optional'; 
    onAdd?: () => void;
  }) => (
    <div 
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <div className="text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="flex items-center gap-3">
        {onAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Plus size={14} className="inline mr-1" />
            Add
          </button>
        )}
        {status && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full uppercase tracking-wide ${
            status === 'required' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : status === 'recommended'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {status}
          </span>
        )}
        <div className="text-blue-600 dark:text-blue-400">
          {expandedSections.includes(id) ? <Minus size={20} /> : <Plus size={20} />}
        </div>
      </div>
    </div>
  );

  const FormGrid = ({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) => (
    <div className={`grid gap-4 ${fullWidth ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {children}
    </div>
  );

  const FormField = ({ 
    label, 
    required = false, 
    children 
  }: { 
    label: string; 
    required?: boolean; 
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = ({ 
    value, 
    onChange, 
    placeholder, 
    type = 'text',
    required = false 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string; 
    type?: string;
    required?: boolean;
  }) => (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
    />
  );

  const TextArea = ({ 
    value, 
    onChange, 
    placeholder, 
    rows = 3 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string; 
    rows?: number;
  }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical transition-colors"
    />
  );

  const Select = ({ 
    value, 
    onChange, 
    options, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    options: Array<{ value: string; label: string }>; 
    placeholder?: string;
  }) => (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="text-blue-600 dark:text-blue-400" size={28} />
                📋 Finalize Your Resume
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Review your parsed information, select a template, and generate your professional PDF
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="personal"
              icon={<User size={20} />}
              title="Personal Information"
              status="required"
            />
            {expandedSections.includes('personal') && (
              <div className="p-6">
                <FormGrid>
                  <FormField label="Full Name" required>
                    <Input
                      value={formData.personal?.name}
                      onChange={(value) => updateField('personal', 'name', value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </FormField>
                  <FormField label="Email Address" required>
                    <Input
                      type="email"
                      value={formData.personal?.email}
                      onChange={(value) => updateField('personal', 'email', value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </FormField>
                  <FormField label="Phone Number">
                    <Input
                      type="tel"
                      value={formData.personal?.phone}
                      onChange={(value) => updateField('personal', 'phone', value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </FormField>
                  <FormField label="Location">
                    <Input
                      value={formData.personal?.location}
                      onChange={(value) => updateField('personal', 'location', value)}
                      placeholder="City, State"
                    />
                  </FormField>
                  <FormField label="LinkedIn URL">
                    <Input
                      type="url"
                      value={formData.personal?.linkedin}
                      onChange={(value) => updateField('personal', 'linkedin', value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </FormField>
                  <FormField label="Personal Website">
                    <Input
                      type="url"
                      value={formData.personal?.website}
                      onChange={(value) => updateField('personal', 'website', value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </FormField>
                </FormGrid>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="education"
              icon={<GraduationCap size={20} />}
              title="Education"
              onAdd={() => addEntry('education')}
            />
            {expandedSections.includes('education') && (
              <div className="p-6 space-y-6">
                {formData.education?.map((edu: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Education {index + 1}</h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeEntry('education', index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <FormGrid>
                      <FormField label="School/University" required>
                        <Input
                          value={edu.school}
                          onChange={(value) => updateField('education', 'school', value, index)}
                          placeholder="University Name"
                          required
                        />
                      </FormField>
                      <FormField label="Degree" required>
                        <Input
                          value={edu.degree}
                          onChange={(value) => updateField('education', 'degree', value, index)}
                          placeholder="Bachelor of Science"
                          required
                        />
                      </FormField>
                      <FormField label="Field of Study">
                        <Input
                          value={edu.field}
                          onChange={(value) => updateField('education', 'field', value, index)}
                          placeholder="Computer Science"
                        />
                      </FormField>
                      <FormField label="GPA">
                        <Input
                          value={edu.gpa}
                          onChange={(value) => updateField('education', 'gpa', value, index)}
                          placeholder="3.8/4.0"
                        />
                      </FormField>
                      <FormField label="Start Date">
                        <Input
                          value={edu.start_date}
                          onChange={(value) => updateField('education', 'start_date', value, index)}
                          placeholder="YYYY-MM"
                        />
                      </FormField>
                      <FormField label="End Date">
                        <Input
                          value={edu.end_date}
                          onChange={(value) => updateField('education', 'end_date', value, index)}
                          placeholder="YYYY-MM or Present"
                        />
                      </FormField>
                    </FormGrid>
                    <div className="mt-4">
                      <FormField label="Location">
                        <Input
                          value={edu.location}
                          onChange={(value) => updateField('education', 'location', value, index)}
                          placeholder="City, State"
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experience */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="experience"
              icon={<Briefcase size={20} />}
              title="Work Experience"
              onAdd={() => addEntry('experience')}
            />
            {expandedSections.includes('experience') && (
              <div className="p-6 space-y-6">
                {formData.experience?.map((exp: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Experience {index + 1}</h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeEntry('experience', index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <FormGrid>
                      <FormField label="Company/Organization" required>
                        <Input
                          value={exp.company}
                          onChange={(value) => updateField('experience', 'company', value, index)}
                          placeholder="Company Name"
                          required
                        />
                      </FormField>
                      <FormField label="Position" required>
                        <Input
                          value={exp.position}
                          onChange={(value) => updateField('experience', 'position', value, index)}
                          placeholder="Job Title"
                          required
                        />
                      </FormField>
                      <FormField label="Start Date">
                        <Input
                          value={exp.start_date}
                          onChange={(value) => updateField('experience', 'start_date', value, index)}
                          placeholder="YYYY-MM"
                        />
                      </FormField>
                      <FormField label="End Date">
                        <Input
                          value={exp.end_date}
                          onChange={(value) => updateField('experience', 'end_date', value, index)}
                          placeholder="YYYY-MM or Present"
                        />
                      </FormField>
                    </FormGrid>
                    <div className="mt-4 space-y-4">
                      <FormField label="Location">
                        <Input
                          value={exp.location}
                          onChange={(value) => updateField('experience', 'location', value, index)}
                          placeholder="City, State"
                        />
                      </FormField>
                      <FormField label="Responsibilities & Achievements">
                        <TextArea
                          value={Array.isArray(exp.highlights) ? exp.highlights.join('\n') : exp.highlights}
                          onChange={(value) => updateField('experience', 'highlights', value, index)}
                          placeholder="• Achievement with quantifiable results&#10;• Another key responsibility&#10;• Third major contribution"
                          rows={4}
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="skills"
              icon={<Wrench size={20} />}
              title="Skills"
              status="recommended"
            />
            {expandedSections.includes('skills') && (
              <div className="p-6">
                <FormField label="Skills (comma-separated)">
                  <TextArea
                    value={formData.skills}
                    onChange={(value) => updateField('', 'skills', value)}
                    placeholder="Python, Django, JavaScript, HTML, CSS, Git, SQL, React, Node.js, Project Management, Leadership..."
                    rows={3}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    💡 Include both technical skills and soft skills. Separate each skill with a comma.
                  </p>
                </FormField>
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="projects"
              icon={<Rocket size={20} />}
              title="Projects"
              status="optional"
              onAdd={() => addEntry('projects')}
            />
            {expandedSections.includes('projects') && (
              <div className="p-6 space-y-6">
                {formData.projects?.map((project: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Project {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeEntry('projects', index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <FormGrid>
                      <FormField label="Project Title" required>
                        <Input
                          value={project.title}
                          onChange={(value) => updateField('projects', 'title', value, index)}
                          placeholder="Project Name"
                          required
                        />
                      </FormField>
                      <FormField label="Project URL">
                        <Input
                          type="url"
                          value={project.url}
                          onChange={(value) => updateField('projects', 'url', value, index)}
                          placeholder="https://github.com/username/project"
                        />
                      </FormField>
                    </FormGrid>
                    <div className="mt-4 space-y-4">
                      <FormField label="Description">
                        <TextArea
                          value={project.description}
                          onChange={(value) => updateField('projects', 'description', value, index)}
                          placeholder="Brief description of the project..."
                          rows={3}
                        />
                      </FormField>
                      <FormField label="Technologies Used">
                        <Input
                          value={project.technologies}
                          onChange={(value) => updateField('projects', 'technologies', value, index)}
                          placeholder="Python, React, PostgreSQL..."
                        />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              id="template"
              icon={<Palette size={20} />}
              title="Template & Format"
              status="required"
            />
            {expandedSections.includes('template') && (
              <div className="p-6 space-y-6">
                {/* Format Selection */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📄 Output Format</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      formatChoice === 'html' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="format_choice"
                        value="html"
                        checked={formatChoice === 'html'}
                        onChange={(e) => dispatch(setFormatChoice(e.target.value))}
                        className="text-blue-600"
                      />
                      <div className="text-2xl">📋</div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">Structured Templates</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Professional PDF templates with predefined layouts</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      formatChoice === 'markdown' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="format_choice"
                        value="markdown"
                        checked={formatChoice === 'markdown'}
                        onChange={(e) => dispatch(setFormatChoice(e.target.value))}
                        className="text-blue-600"
                      />
                      <div className="text-2xl">✏️</div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">Markdown Editor</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Custom formatting with markdown syntax</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Template Selection */}
                {formatChoice === 'html' && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎨 Choose Template Style</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {templates.map((template) => (
                        <label
                          key={template.id}
                          className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                            selectedTemplate === template.id
                              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <div className="h-40 bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                              {template.name.charAt(0)}
                            </div>
                          </div>
                          <div className="p-3">
                            <input
                              type="radio"
                              name="template"
                              value={template.id}
                              checked={selectedTemplate === template.id}
                              onChange={(e) => dispatch(setSelectedTemplate(e.target.value))}
                              className="mr-2"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Professional layout</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
              🚀 Ready to Generate?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Review your information above and click generate to create your professional PDF resume.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                ← Edit Resume Text
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-all hover:shadow-lg"
              >
                <Download size={20} />
                Generate PDF Resume
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeTemplateForm;