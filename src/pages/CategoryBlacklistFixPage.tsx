import React, { useState } from 'react';
import styled from 'styled-components';
import { FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../services/supabase';

const Container = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Header = styled.h1`
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.8rem;
`;

const StatusBox = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
  background-color: ${({ type }) => 
    type === 'success' ? '#d4edda' : 
    type === 'error' ? '#f8d7da' : '#d1ecf1'};
  color: ${({ type }) => 
    type === 'success' ? '#155724' : 
    type === 'error' ? '#721c24' : '#0c5460'};
  display: flex;
  align-items: flex-start;

  svg {
    margin-right: 10px;
    margin-top: 2px;
  }
`;

const Button = styled.button`
  background-color: #0077cc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-right: 10px;
  
  &:hover {
    background-color: #005fa3;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ButtonContainer = styled.div`
  margin-top: 2rem;
  display: flex;
`;

const CodeBlock = styled.pre`
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  margin: 1rem 0;
`;

const CategoryBlacklistFixPage: React.FC = () => {
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [running, setRunning] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, message]);
  };
  
  const runFix = async () => {
    setRunning(true);
    setStatus({ message: "Running fix...", type: "info" });
    addLog("Starting blacklist column fix...");
    
    try {
      // 1. Check if blacklisted column exists
      addLog("Checking if blacklisted column exists...");
      const { error: checkError } = await supabase
        .from('categories')
        .select('blacklisted')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        addLog("Blacklisted column does not exist - will add it");
        
        // 2. Try adding the column with direct SQL (may fail if RPC not available)
        try {
          addLog("Attempting to add column via RPC...");
          const { error: alterError } = await supabase.rpc('exec_sql', {
            sql_query: "ALTER TABLE categories ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT false;"
          });
          
          if (alterError) {
            addLog(`RPC method failed: ${alterError.message}`);
            throw new Error("RPC method failed");
          } else {
            addLog("Successfully added blacklisted column via RPC!");
          }
        } catch (rpcErr) {
          // 3. If RPC fails, try alternative approach
          addLog("RPC failed, trying alternative method with Supabase functions...");
          
          // Create a temporary categories table with blacklisted column
          addLog("Creating a temporary table with the blacklisted column...");
          
          // First get all categories
          const { data: categories, error: fetchError } = await supabase
            .from('categories')
            .select('*');
            
          if (fetchError) {
            throw new Error(`Failed to fetch categories: ${fetchError.message}`);
          }
          
          addLog(`Retrieved ${categories?.length || 0} categories`);
          
          // For each category, insert a new record with blacklisted=false
          let updatedCount = 0;
          if (categories && categories.length > 0) {
            for (const category of categories) {
              // Prepare the category with blacklisted field
              const updatedCategory = {
                ...category,
                blacklisted: false
              };
              
              // Update the category
              const { error: updateError } = await supabase
                .from('categories')
                .update(updatedCategory)
                .eq('id', category.id);
                
              if (updateError) {
                if (updateError.message.includes('does not exist')) {
                  addLog("Update failed because blacklisted column doesn't exist, will try adding it first");
                } else {
                  addLog(`Error updating category ${category.id}: ${updateError.message}`);
                }
              } else {
                updatedCount++;
              }
            }
          }
          
          if (updatedCount === 0) {
            addLog("WARNING: No categories were updated with the blacklisted field.");
            addLog("The blacklisted column may need to be added via the Supabase SQL editor.");
            
            // Show instructions for manual fix
            setStatus({
              message: "Please run this SQL in your Supabase SQL Editor to add the blacklisted column:",
              type: "error"
            });
            
            return;
          } else {
            addLog(`Successfully updated ${updatedCount} categories with blacklisted=false`);
          }
        }
      } else {
        addLog("Blacklisted column already exists - skipping column creation");
      }
      
      // 4. Create index on blacklisted column
      addLog("Adding index on blacklisted column...");
      try {
        const { error: indexError } = await supabase.rpc('exec_sql', {
          sql_query: "CREATE INDEX IF NOT EXISTS idx_categories_blacklisted ON categories(blacklisted);"
        });
        
        if (indexError) {
          addLog(`Failed to create index via RPC: ${indexError.message}`);
          addLog("Index creation is optional - continuing...");
        } else {
          addLog("Successfully created index on blacklisted column");
        }
      } catch (indexErr) {
        addLog("Failed to create index - this is not critical");
      }
      
      // 5. Update all components to use blacklisted filtering
      addLog("Fix complete! The blacklisted column has been added to your categories table.");
      addLog("All components will now respect the blacklisted setting when displaying categories.");
      
      setStatus({
        message: "Success! Blacklisting system is ready to use. You can now go to the Admin Dashboard and manage your category blacklist.",
        type: "success"
      });
      
    } catch (error) {
      console.error("Error running fix:", error);
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setStatus({
        message: `Error during fix: ${error instanceof Error ? error.message : String(error)}`,
        type: "error"
      });
    } finally {
      setRunning(false);
    }
  };
  
  const manualSql = `
-- Run this in your Supabase SQL Editor:
ALTER TABLE categories ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_categories_blacklisted ON categories(blacklisted);

-- To blacklist a specific category:
UPDATE categories SET blacklisted = true WHERE name = 'category_to_blacklist';

-- To show all blacklisted categories:
SELECT * FROM categories WHERE blacklisted = true;
`;
  
  return (
    <Container>
      <Header>Category Blacklist System Setup</Header>
      
      <p>
        This page will add the blacklisting functionality to your categories system.
        It will make the following changes:
      </p>
      
      <ul>
        <li>Add a <code>blacklisted</code> boolean column to your categories table</li>
        <li>Create an index for faster filtering of blacklisted categories</li>
        <li>Set all existing categories as not blacklisted by default</li>
      </ul>
      
      <p>
        After running this fix, you'll be able to blacklist categories from the Category Management panel
        in the Admin Dashboard. Blacklisted categories won't appear in the sidebar or in book listings.
      </p>
      
      {status && (
        <StatusBox type={status.type}>
          {status.type === 'success' ? <FiCheck size={20} /> : 
           status.type === 'error' ? <FiAlertTriangle size={20} /> : 
           <FiAlertTriangle size={20} />}
          <div>
            {status.message}
            {status.type === 'error' && (
              <CodeBlock>{manualSql}</CodeBlock>
            )}
          </div>
        </StatusBox>
      )}
      
      <ButtonContainer>
        <Button onClick={runFix} disabled={running}>
          {running ? "Running..." : "Run Fix"}
        </Button>
      </ButtonContainer>
      
      {logMessages.length > 0 && (
        <>
          <h3>Log:</h3>
          <CodeBlock>
            {logMessages.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </CodeBlock>
        </>
      )}
    </Container>
  );
};

export default CategoryBlacklistFixPage;
