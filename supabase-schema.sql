-- =============================================
-- MyJobSearchAgent Database Schema for Supabase
-- =============================================

-- Enable Row Level Security
-- This is important for Supabase to ensure users can only access their own data

-- 1. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  resume_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  current_job_title TEXT,
  years_of_experience INTEGER DEFAULT 0,
  skills TEXT[], -- Array of skills
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_applied' CHECK (
    status IN ('not_applied', 'applied', 'interviewing', 'offered', 'rejected', 'accepted', 'declined')
  ),
  application_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_posting_url TEXT,
  job_description TEXT,
  notes TEXT,
  salary_range TEXT,
  location TEXT,
  employment_type TEXT, -- full-time, part-time, contract, internship
  remote_option BOOLEAN DEFAULT FALSE,
  contact_person TEXT,
  contact_email TEXT,
  interview_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=high
  source TEXT, -- where the job was found (LinkedIn, Indeed, etc.)
  resume_url TEXT, -- URL to resume document
  cover_letter_url TEXT, -- URL to cover letter document
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create job_preferences table
CREATE TABLE IF NOT EXISTS public.job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_job_titles TEXT[] NOT NULL,
  preferred_locations TEXT[],
  preferred_salary_min INTEGER,
  preferred_salary_max INTEGER,
  preferred_employment_types TEXT[], -- ['full-time', 'contract', etc.]
  remote_preference TEXT DEFAULT 'flexible' CHECK (
    remote_preference IN ('remote_only', 'hybrid', 'on_site', 'flexible')
  ),
  preferred_company_sizes TEXT[], -- ['startup', 'small', 'medium', 'large', 'enterprise']
  preferred_industries TEXT[],
  excluded_companies TEXT[],
  minimum_experience_years INTEGER DEFAULT 0,
  maximum_experience_years INTEGER,
  preferred_skills TEXT[],
  deal_breakers TEXT[],
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One preference record per user
);

-- 4. Create application_activities table (for tracking application history)
CREATE TABLE IF NOT EXISTS public.application_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('status_change', 'note_added', 'interview_scheduled', 'follow_up', 'document_sent', 'response_received')
  ),
  old_status TEXT,
  new_status TEXT,
  description TEXT NOT NULL,
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create application_documents table (for storing resumes, cover letters, etc.)
CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN ('resume', 'cover_letter', 'portfolio', 'transcript', 'certification', 'other')
  ),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Create Indexes for Performance
-- =============================================

-- Indexes for job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_application_date ON public.job_applications(application_date);
CREATE INDEX IF NOT EXISTS idx_job_applications_company_name ON public.job_applications(company_name);
CREATE INDEX IF NOT EXISTS idx_job_applications_position ON public.job_applications(position);

-- Indexes for application_activities
CREATE INDEX IF NOT EXISTS idx_application_activities_application_id ON public.application_activities(application_id);
CREATE INDEX IF NOT EXISTS idx_application_activities_activity_date ON public.application_activities(activity_date);

-- Indexes for application_documents
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON public.application_documents(application_id);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Job applications policies
CREATE POLICY "Users can view own job applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job applications" ON public.job_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job applications" ON public.job_applications
  FOR DELETE USING (auth.uid() = user_id);

-- Job preferences policies
CREATE POLICY "Users can view own job preferences" ON public.job_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job preferences" ON public.job_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job preferences" ON public.job_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job preferences" ON public.job_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Application activities policies
CREATE POLICY "Users can view activities for own applications" ON public.application_activities
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_activities.application_id
    )
  );

CREATE POLICY "Users can insert activities for own applications" ON public.application_activities
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_activities.application_id
    )
  );

-- Application documents policies
CREATE POLICY "Users can view documents for own applications" ON public.application_documents
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_documents.application_id
    )
  );

CREATE POLICY "Users can insert documents for own applications" ON public.application_documents
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_documents.application_id
    )
  );

CREATE POLICY "Users can update documents for own applications" ON public.application_documents
  FOR UPDATE USING (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_documents.application_id
    )
  );

CREATE POLICY "Users can delete documents for own applications" ON public.application_documents
  FOR DELETE USING (
    auth.uid() = (
      SELECT user_id FROM public.job_applications 
      WHERE id = application_documents.application_id
    )
  );

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at 
  BEFORE UPDATE ON public.job_applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_preferences_updated_at 
  BEFORE UPDATE ON public.job_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log application status changes
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_activities (
      application_id,
      activity_type,
      old_status,
      new_status,
      description
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for application status changes
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- =============================================
-- Helpful Views
-- =============================================

-- View for application statistics
CREATE OR REPLACE VIEW application_stats AS
SELECT 
  user_id,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
  COUNT(*) FILTER (WHERE status = 'interviewing') as interview_count,
  COUNT(*) FILTER (WHERE status = 'offered') as offer_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE status = 'not_applied') as pending_count
FROM public.job_applications
GROUP BY user_id;

-- View for recent activities
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
  aa.*,
  ja.company_name,
  ja.position
FROM public.application_activities aa
JOIN public.job_applications ja ON aa.application_id = ja.id
ORDER BY aa.activity_date DESC;

-- =============================================
-- Sample Data (Optional - Remove in production)
-- =============================================

-- You can add sample data here for testing purposes
-- This section should be removed in production

-- INSERT INTO public.job_applications (user_id, company_name, position, status) 
-- VALUES 
--   (auth.uid(), 'Example Corp', 'Software Developer', 'applied'),
--   (auth.uid(), 'Tech Startup', 'Frontend Developer', 'interviewing');

-- =============================================
-- End of Schema
-- =============================================
