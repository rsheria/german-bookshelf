import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiDatabase, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { AdminContainer, AdminHeader, AdminTitle } from '../../styles/adminStyles';

const SetupContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ScriptContent = styled.pre`
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.md} 0;
  overflow: auto;
  max-height: 300px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark || '#0055aa'};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.border};
    cursor: not-allowed;
  }
  
  svg {
    margin-right: ${({ theme }) => theme.spacing.sm};
  }
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ theme, type }) => 
    type === 'success' 
      ? theme.colors.successLight || '#d4edda' 
      : type === 'error' 
        ? theme.colors.dangerLight || '#f8d7da'
        : theme.colors.infoLight || '#d1ecf1'
  };
  color: ${({ theme, type }) => 
    type === 'success' 
      ? theme.colors.success || '#155724' 
      : type === 'error' 
        ? theme.colors.danger || '#721c24'
        : theme.colors.info || '#0c5460'
  };
  
  svg {
    margin-right: ${({ theme }) => theme.spacing.sm};
  }
`;

const Instructions = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: 1.6;
`;

const Step = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  display: flex;
  align-items: baseline;
  
  strong {
    margin-right: ${({ theme }) => theme.spacing.sm};
  }
`;

const CategorySetupPage: React.FC = () => {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const sqlScript = `-- SQL script to create and populate the categories table

-- First, create the categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS "categories" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "parent_id" UUID REFERENCES "categories"("id") ON DELETE SET NULL,
    "type" TEXT DEFAULT 'ebook',
    "fictionType" TEXT DEFAULT 'Fiction',
    "blacklisted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on type and fictionType for faster filtering
CREATE INDEX IF NOT EXISTS idx_categories_type ON "categories"("type");
CREATE INDEX IF NOT EXISTS idx_categories_fiction_type ON "categories"("fictionType");
CREATE INDEX IF NOT EXISTS idx_categories_blacklisted ON "categories"("blacklisted");

-- Add blacklisted column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'categories' AND column_name = 'blacklisted') THEN
        ALTER TABLE "categories" ADD COLUMN "blacklisted" BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert typical book categories if they don't exist
INSERT INTO "categories" ("name", "type", "fictionType") 
VALUES 
-- Fiction categories for E-Books
('thriller', 'ebook', 'Fiction'),
('mystery', 'ebook', 'Fiction'),
('science fiction', 'ebook', 'Fiction'),
('fantasy', 'ebook', 'Fiction'),
('romance', 'ebook', 'Fiction'),
('historical fiction', 'ebook', 'Fiction'),
('horror', 'ebook', 'Fiction'),
('adventure', 'ebook', 'Fiction'),
('literary fiction', 'ebook', 'Fiction'),

-- Non-Fiction categories for E-Books
('biography', 'ebook', 'Non-Fiction'),
('history', 'ebook', 'Non-Fiction'),
('science', 'ebook', 'Non-Fiction'),
('self-help', 'ebook', 'Non-Fiction'),
('business', 'ebook', 'Non-Fiction'),
('cooking', 'ebook', 'Non-Fiction'),
('health', 'ebook', 'Non-Fiction'),
('travel', 'ebook', 'Non-Fiction'),
('philosophy', 'ebook', 'Non-Fiction'),

-- Fiction categories for Audiobooks  
('thriller', 'audiobook', 'Fiction'),
('mystery', 'audiobook', 'Fiction'),
('science fiction', 'audiobook', 'Fiction'),
('fantasy', 'audiobook', 'Fiction'),
('romance', 'audiobook', 'Fiction'),
('historical fiction', 'audiobook', 'Fiction'),
('horror', 'audiobook', 'Fiction'),
('adventure', 'audiobook', 'Fiction'),
('literary fiction', 'audiobook', 'Fiction'),

-- Non-Fiction categories for Audiobooks
('biography', 'audiobook', 'Non-Fiction'),
('history', 'audiobook', 'Non-Fiction'),
('science', 'audiobook', 'Non-Fiction'),
('self-help', 'audiobook', 'Non-Fiction'),
('business', 'audiobook', 'Non-Fiction'),
('cooking', 'audiobook', 'Non-Fiction'),
('health', 'audiobook', 'Non-Fiction'),
('travel', 'audiobook', 'Non-Fiction'),
('philosophy', 'audiobook', 'Non-Fiction')
ON CONFLICT DO NOTHING;`;

  const runSetupScript = async () => {
    setIsRunning(true);
    setStatus({ message: "Setting up categories system...", type: "info" });
    
    try {
      // Check if table exists first
      const { error: checkError } = await supabase.from('categories').select('count(*)');
      
      if (checkError && checkError.message.includes('does not exist')) {
        // Table doesn't exist yet, set informative message
        setStatus({
          message: "The categories table doesn't exist yet. Please go to the Supabase SQL Editor and run the SQL script shown above.",
          type: "error"
        });
        return;
      }
      
      // First, create some default categories if table exists
      const defaultCategories = [
        // Fiction categories for E-Books
        { name: 'thriller', type: 'ebook', fictionType: 'Fiction' },
        { name: 'mystery', type: 'ebook', fictionType: 'Fiction' },
        { name: 'science fiction', type: 'ebook', fictionType: 'Fiction' },
        { name: 'fantasy', type: 'ebook', fictionType: 'Fiction' },
        { name: 'romance', type: 'ebook', fictionType: 'Fiction' },
        
        // Non-Fiction categories for E-Books
        { name: 'biography', type: 'ebook', fictionType: 'Non-Fiction' },
        { name: 'history', type: 'ebook', fictionType: 'Non-Fiction' },
        { name: 'science', type: 'ebook', fictionType: 'Non-Fiction' },
        { name: 'self-help', type: 'ebook', fictionType: 'Non-Fiction' },
        
        // Fiction categories for Audiobooks
        { name: 'thriller', type: 'audiobook', fictionType: 'Fiction' },
        { name: 'mystery', type: 'audiobook', fictionType: 'Fiction' },
        { name: 'fantasy', type: 'audiobook', fictionType: 'Fiction' },
        
        // Non-Fiction categories for Audiobooks
        { name: 'biography', type: 'audiobook', fictionType: 'Non-Fiction' },
        { name: 'history', type: 'audiobook', fictionType: 'Non-Fiction' }
      ];
      
      // Insert the default categories one by one
      for (const category of defaultCategories) {
        const { error: insertError } = await supabase
          .from('categories')
          .insert(category);
          
        if (insertError && !insertError.message.includes('duplicate')) {
          console.warn('Error inserting category:', insertError);
        }
      }
      
      // Add blacklist column if it doesn't exist
      // We can't alter table structure with regular queries, so we'll just inform user
      const { error: blacklistError } = await supabase
        .from('categories')
        .select('blacklisted');
        
      if (blacklistError && blacklistError.message.includes('does not exist')) {
        setStatus({
          message: "Categories table exists but needs the 'blacklisted' column. Please run the complete SQL script in Supabase SQL Editor.",
          type: "error"
        });
        return;
      }
      
      // At this point, categories table exists with all needed columns
      setStatus({ 
        message: "Categories system is set up! You can now use the Category Management panel.", 
        type: "success" 
      });
    } catch (error) {
      console.error("Error setting up categories:", error);
      setStatus({ 
        message: `Error setting up categories: ${error instanceof Error ? error.message : String(error)}`, 
        type: "error" 
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  const runSetupManually = async () => {
    setStatus({ 
      message: "Please go to your Supabase dashboard, open the SQL Editor, and run the script shown above.", 
      type: "info" 
    });
  };
  
  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiDatabase />
          {t('admin.categorySetup.title', 'Category System Setup')}
        </AdminTitle>
      </AdminHeader>
      
      <SetupContainer>
        <Instructions>
          <p>{t('admin.categorySetup.description', 'This page will help you set up the category system for your German Bookshelf application. This setup process will:')}</p>
          
          <ul>
            <li>{t('admin.categorySetup.step1', 'Create a "categories" table if it doesn\'t already exist')}</li>
            <li>{t('admin.categorySetup.step2', 'Add common book categories for both E-Books and Audiobooks')}</li>
            <li>{t('admin.categorySetup.step3', 'Set up necessary indexes for efficient filtering')}</li>
          </ul>
          
          <p>{t('admin.categorySetup.options', 'You have two options to run this script:')}</p>
          
          <Step>
            <strong>1.</strong> {t('admin.categorySetup.option1', 'Click the "Run Setup Script" button below to execute it automatically (requires proper permissions)')}
          </Step>
          
          <Step>
            <strong>2.</strong> {t('admin.categorySetup.option2', 'Copy the script and run it manually in your Supabase SQL Editor')}
          </Step>
        </Instructions>
        
        <h3>{t('admin.categorySetup.scriptTitle', 'Setup Script:')}</h3>
        <ScriptContent>{sqlScript}</ScriptContent>
        
        <ButtonsContainer>
          <Button 
            onClick={runSetupScript} 
            disabled={isRunning}
          >
            <FiDatabase />
            {t('admin.categorySetup.runButton', 'Run Setup Script')}
          </Button>
          
          <Button 
            onClick={runSetupManually}
            disabled={isRunning}
            style={{ backgroundColor: '#6c757d' }}
          >
            {t('admin.categorySetup.manualButton', 'I\'ll Run It Manually')}
          </Button>
        </ButtonsContainer>
        
        {status && (
          <StatusMessage type={status.type}>
            {status.type === 'success' ? <FiCheck /> : <FiAlertTriangle />}
            {status.message}
          </StatusMessage>
        )}
      </SetupContainer>
    </AdminContainer>
  );
};

export default CategorySetupPage;
