-- Create career_paths table for roadmap templates and user paths
CREATE TABLE IF NOT EXISTS career_paths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🛣️',
    difficulty VARCHAR(50) DEFAULT 'Intermediate',
    estimated_duration VARCHAR(100),
    progress INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create milestones table for roadmap learning modules
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    career_path_id INTEGER REFERENCES career_paths(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    estimated_time VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create milestone_skills table for skills associated with each milestone
CREATE TABLE IF NOT EXISTS milestone_skills (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create milestone_resources table for learning resources
CREATE TABLE IF NOT EXISTS milestone_resources (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    resource_url VARCHAR(500),
    resource_type VARCHAR(50) DEFAULT 'link',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_career_paths_user_id ON career_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_career_paths_is_template ON career_paths(is_template);
CREATE INDEX IF NOT EXISTS idx_milestones_career_path_id ON milestones(career_path_id);
CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(completed);
CREATE INDEX IF NOT EXISTS idx_milestone_skills_milestone_id ON milestone_skills(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_resources_milestone_id ON milestone_resources(milestone_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_career_paths_updated_at BEFORE UPDATE ON career_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
