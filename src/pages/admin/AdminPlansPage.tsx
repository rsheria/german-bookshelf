import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiPlus, FiEdit, FiTrash, FiCheck, FiX, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Plan } from '../../types/supabase';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  LoadingState,
  EmptyState,
  ActionButtons,
  IconButton,
  SectionTitle
} from '../../styles/adminStyles';

interface EditingPlan extends Omit<Plan, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
}

const AdminPlansPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form to edit plan features as key-value pairs
  const [features, setFeatures] = useState<Array<{key: string, value: any}>>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  // When editing a plan, convert its features object to array of key-value pairs
  useEffect(() => {
    if (editingPlan) {
      const featureEntries = Object.entries(editingPlan.features || {}).map(([key, value]) => ({
        key,
        value
      }));
      setFeatures(featureEntries.length ? featureEntries : [{ key: '', value: '' }]);
    } else {
      setFeatures([{ key: '', value: '' }]);
    }
  }, [editingPlan]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      daily_quota: plan.daily_quota,
      monthly_request_quota: plan.monthly_request_quota,
      features: plan.features,
      id: plan.id
    });
  };

  const handleCreatePlan = () => {
    setEditingPlan({
      name: '',
      description: '',
      price: 0,
      daily_quota: 5,
      monthly_request_quota: 10,
      features: {}
    });
    setIsCreating(true);
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setIsCreating(false);
    setError(null);
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm(t('confirmDeletePlan'))) return;
    
    try {
      setIsUpdating(true);
      
      // Check if any users are using this plan
      const { data: usersWithPlan, error: usersCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('plan_id', id);
      
      if (usersCheckError) throw usersCheckError;
      
      if (usersWithPlan && usersWithPlan.length > 0) {
        alert(t('cannotDeletePlanWithUsers', { count: usersWithPlan.length }));
        return;
      }
      
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPlans(plans.filter(plan => plan.id !== id));
    } catch (error: any) {
      console.error('Error deleting plan:', error.message);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    try {
      setIsUpdating(true);
      setError(null);
      
      // Validate form
      if (!editingPlan.name.trim()) {
        setError(t('planNameRequired'));
        return;
      }
      
      // Convert features array to object
      const featuresObject: Record<string, any> = {};
      for (const item of features) {
        if (item.key.trim()) {
          try {
            // Try to parse value as JSON if it's a string that looks like an object or array
            if (typeof item.value === 'string' && 
                (item.value.startsWith('{') || item.value.startsWith('['))) {
              featuresObject[item.key] = JSON.parse(item.value);
            } else {
              featuresObject[item.key] = item.value;
            }
          } catch (e) {
            // If parsing fails, use original value
            featuresObject[item.key] = item.value;
          }
        }
      }
      
      const planData = {
        name: editingPlan.name,
        description: editingPlan.description,
        price: editingPlan.price,
        daily_quota: editingPlan.daily_quota,
        monthly_request_quota: editingPlan.monthly_request_quota,
        features: featuresObject
      };
      
      let result;
      
      if (isCreating) {
        // Create new plan
        result = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single();
      } else if (editingPlan.id) {
        // Update existing plan
        result = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)
          .select()
          .single();
      }
      
      if (result?.error) throw result.error;
      
      await fetchPlans();
      setEditingPlan(null);
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error saving plan:', error.message);
      setError(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const addFeatureField = () => {
    setFeatures([...features, { key: '', value: '' }]);
  };

  const removeFeatureField = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeatureField = (index: number, field: 'key' | 'value', value: string) => {
    const updatedFeatures = [...features];
    updatedFeatures[index][field] = value;
    setFeatures(updatedFeatures);
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>
          <FiDollarSign /> {t('subscriptionPlans')}
        </AdminTitle>
        <Button onClick={handleCreatePlan}>
          <FiPlus /> {t('createNewPlan')}
        </Button>
      </AdminHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingState>{t('loadingPlans')}</LoadingState>
      ) : editingPlan ? (
        <PlanForm>
          <SectionTitle>
            {isCreating ? t('createNewPlan') : t('editPlan')}
          </SectionTitle>
          
          <FormGroup>
            <Label>{t('planName')}</Label>
            <Input
              type="text"
              value={editingPlan.name}
              onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
              placeholder={t('planNamePlaceholder')}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('planDescription')}</Label>
            <TextArea
              value={editingPlan.description}
              onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
              placeholder={t('planDescriptionPlaceholder')}
            />
          </FormGroup>
          
          <FormRow>
            <FormGroup>
              <Label>{t('price')} ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editingPlan.price}
                onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value) || 0})}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>{t('dailyQuota')}</Label>
              <Input
                type="number"
                min="0"
                value={editingPlan.daily_quota}
                onChange={(e) => setEditingPlan({...editingPlan, daily_quota: parseInt(e.target.value) || 0})}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>{t('monthlyRequestQuota')}</Label>
              <Input
                type="number"
                min="0"
                value={editingPlan.monthly_request_quota}
                onChange={(e) => setEditingPlan({...editingPlan, monthly_request_quota: parseInt(e.target.value) || 0})}
              />
            </FormGroup>
          </FormRow>
          
          <FeaturesSection>
            <SectionTitle>
              {t('planFeatures')}
              <IconButton onClick={addFeatureField}>
                <FiPlus />
              </IconButton>
            </SectionTitle>
            
            {features.map((feature, index) => (
              <FeatureRow key={index}>
                <FormGroup>
                  <Input
                    type="text"
                    value={feature.key}
                    onChange={(e) => updateFeatureField(index, 'key', e.target.value)}
                    placeholder={t('featureKey')}
                  />
                </FormGroup>
                <FormGroup>
                  <Input
                    type="text"
                    value={feature.value}
                    onChange={(e) => updateFeatureField(index, 'value', e.target.value)}
                    placeholder={t('featureValue')}
                  />
                </FormGroup>
                <IconButton 
                  onClick={() => removeFeatureField(index)}
                  disabled={features.length <= 1}
                >
                  <FiTrash />
                </IconButton>
              </FeatureRow>
            ))}
          </FeaturesSection>
          
          <FormActions>
            <Button 
              onClick={handleSavePlan}
              disabled={isUpdating}
              primary
            >
              {isUpdating ? '...' : <><FiCheck /> {t('save')}</>}
            </Button>
            <Button 
              onClick={handleCancelEdit}
              disabled={isUpdating}
            >
              <FiX /> {t('cancel')}
            </Button>
          </FormActions>
        </PlanForm>
      ) : plans.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t('name')}</TableHeader>
                <TableHeader>{t('description')}</TableHeader>
                <TableHeader>{t('price')}</TableHeader>
                <TableHeader>{t('quotas')}</TableHeader>
                <TableHeader>{t('features')}</TableHeader>
                <TableHeader>{t('actions')}</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.description}</TableCell>
                  <TableCell>${plan.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div>{t('daily')}: {plan.daily_quota}</div>
                    <div>{t('monthly')}: {plan.monthly_request_quota}</div>
                  </TableCell>
                  <TableCell>
                    <FeaturesList>
                      {Object.entries(plan.features || {}).map(([key, value]) => (
                        <FeatureItem key={key}>
                          <FeatureKey>{key}:</FeatureKey> 
                          <FeatureValue>
                            {typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                            }
                          </FeatureValue>
                        </FeatureItem>
                      ))}
                    </FeaturesList>
                  </TableCell>
                  <TableCell>
                    <ActionButtons>
                      <IconButton 
                        className="edit"
                        title={t('edit')}
                        onClick={() => handleEditPlan(plan)}
                      >
                        <FiEdit />
                      </IconButton>
                      <IconButton 
                        className="delete"
                        title={t('delete')}
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={isUpdating}
                      >
                        <FiTrash />
                      </IconButton>
                    </ActionButtons>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState>
          {t('noPlans')}
          <Button onClick={handleCreatePlan} primary>
            <FiPlus /> {t('createYourFirstPlan')}
          </Button>
        </EmptyState>
      )}
    </AdminContainer>
  );
};

// Styled components
const ErrorMessage = styled.div`
  background-color: ${props => props.theme.colors.danger}20;
  color: ${props => props.theme.colors.danger};
  padding: 0.75rem 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 0.75rem 1.25rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  background-color: ${props => props.primary ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.primary ? 'white' : props.theme.colors.text};
  border: 1px solid ${props => props.primary ? 'transparent' : props.theme.colors.border};
  
  &:hover {
    transform: translateY(-2px);
    background-color: ${props => props.primary ? props.theme.colors.primaryDark : props.theme.colors.backgroundAlt};
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const PlanForm = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.sm};
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  width: 100%;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundInput};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.backgroundInput};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.fontSize.md};
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}20;
  }
`;

const FeaturesSection = styled.div`
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  
  ${SectionTitle} {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

const FeatureRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  
  button {
    flex: 1;
  }
`;

const FeaturesList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
`;

const FeatureItem = styled.li`
  margin-bottom: 0.5rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FeatureKey = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const FeatureValue = styled.span`
  color: ${props => props.theme.colors.textDim};
`;

export default AdminPlansPage;
