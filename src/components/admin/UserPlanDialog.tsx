import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiPackage, FiX, FiCheckCircle } from 'react-icons/fi';
import { Profile, Plan } from '../../types/supabase';

interface UserPlanDialogProps {
  user: Profile;
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onUpdatePlan: (userId: string, planId: string, dailyQuota: number, monthlyRequestQuota: number) => void;
}

const UserPlanDialog: React.FC<UserPlanDialogProps> = ({ 
  user, 
  plans,
  isOpen,
  onClose, 
  onUpdatePlan
}) => {
  const { t } = useTranslation();
  const [selectedPlanId, setSelectedPlanId] = useState(user.plan_id || '');
  const [dailyQuota, setDailyQuota] = useState(user.daily_quota || 0);
  const [monthlyQuota, setMonthlyQuota] = useState(user.monthly_request_quota || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  if (!isOpen) return null;

  useEffect(() => {
    if (user.plan_id) {
      const plan = plans.find(p => p.id === user.plan_id);
      if (plan) setCurrentPlan(plan);
    }
  }, [user.plan_id, plans]);

  useEffect(() => {
    if (selectedPlanId) {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (plan) {
        setDailyQuota(plan.daily_quota);
        setMonthlyQuota(plan.monthly_request_quota);
      }
    }
  }, [selectedPlanId, plans]);

  const handleAssignPlan = async () => {
    if (!selectedPlanId) {
      setError(t('selectPlanRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      onUpdatePlan(user.id, selectedPlanId, dailyQuota, monthlyQuota);
    } catch (err: any) {
      console.error('Error assigning plan:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <DialogOverlay>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <FiPackage /> {t('managePlan')}: {user.username}
          </DialogTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </DialogHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <DialogBody>
          {currentPlan && user.subscription_end_date && (
            <CurrentPlanSection>
              <SectionTitle>{t('currentPlan')}</SectionTitle>
              <PlanCard>
                <PlanName>{currentPlan.name}</PlanName>
                <PlanDetails>
                  <PlanDetail>
                    <DetailLabel>{t('price')}:</DetailLabel>
                    ${currentPlan.price.toFixed(2)} / {t('month')}
                  </PlanDetail>
                  <PlanDetail>
                    <DetailLabel>{t('quotas')}:</DetailLabel>
                    {t('daily')}: {currentPlan.daily_quota}, {t('monthly')}: {currentPlan.monthly_request_quota}
                  </PlanDetail>
                  <PlanDetail>
                    <DetailLabel>{t('subscription')}:</DetailLabel>
                    {formatDate(user.subscription_start_date)} - {formatDate(user.subscription_end_date)}
                  </PlanDetail>
                </PlanDetails>
              </PlanCard>
            </CurrentPlanSection>
          )}

          <FormGroup>
            <Label>{t('selectPlan')}</Label>
            <PlansContainer>
              {plans.map(plan => (
                <PlanOption
                  key={plan.id}
                  selected={selectedPlanId === plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {selectedPlanId === plan.id && (
                    <SelectedCheckmark>
                      <FiCheckCircle />
                    </SelectedCheckmark>
                  )}
                  <PlanOptionContent>
                    <PlanOptionName>{plan.name}</PlanOptionName>
                    <PlanOptionPrice>${plan.price.toFixed(2)} / {t('month')}</PlanOptionPrice>
                    <PlanOptionDetails>
                      <div>{t('daily')}: {plan.daily_quota}</div>
                      <div>{t('monthly')}: {plan.monthly_request_quota}</div>
                    </PlanOptionDetails>
                  </PlanOptionContent>
                </PlanOption>
              ))}
            </PlansContainer>
          </FormGroup>

          <FormGroup>
            <Label>{t('subscriptionDuration')}</Label>
            <DurationSelector>
              <DurationOption
                selected={dailyQuota === 100}
                onClick={() => setDailyQuota(100)}
              >
                100 {t('daily')}
              </DurationOption>
              <DurationOption
                selected={dailyQuota === 500}
                onClick={() => setDailyQuota(500)}
              >
                500 {t('daily')}
              </DurationOption>
              <DurationOption
                selected={dailyQuota === 1000}
                onClick={() => setDailyQuota(1000)}
              >
                1000 {t('daily')}
              </DurationOption>
              <DurationOption
                selected={dailyQuota === 2000}
                onClick={() => setDailyQuota(2000)}
              >
                2000 {t('daily')}
              </DurationOption>
            </DurationSelector>
          </FormGroup>

          <FormGroup>
            <Label>{t('monthlyQuota')}</Label>
            <DurationSelector>
              <DurationOption
                selected={monthlyQuota === 1000}
                onClick={() => setMonthlyQuota(1000)}
              >
                1000 {t('monthly')}
              </DurationOption>
              <DurationOption
                selected={monthlyQuota === 5000}
                onClick={() => setMonthlyQuota(5000)}
              >
                5000 {t('monthly')}
              </DurationOption>
              <DurationOption
                selected={monthlyQuota === 10000}
                onClick={() => setMonthlyQuota(10000)}
              >
                10000 {t('monthly')}
              </DurationOption>
              <DurationOption
                selected={monthlyQuota === 20000}
                onClick={() => setMonthlyQuota(20000)}
              >
                20000 {t('monthly')}
              </DurationOption>
            </DurationSelector>
          </FormGroup>
        </DialogBody>

        <DialogFooter>
          <CancelButton onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </CancelButton>
          <AssignButton onClick={handleAssignPlan} disabled={isSubmitting}>
            {isSubmitting ? t('assigning') : t('assignPlan')}
          </AssignButton>
        </DialogFooter>
      </DialogContent>
    </DialogOverlay>
  );
};

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContent = styled.div`
  background-color: ${props => props.theme.colors.card};
  border-radius: ${props => props.theme.borderRadius.lg};
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.lg};
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.textDim};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.colors.backgroundAlt};
    color: ${props => props.theme.colors.text};
  }
`;

const DialogBody = styled.div`
  padding: 1.5rem;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const ErrorMessage = styled.div`
  background-color: ${props => props.theme.colors.danger}20;
  color: ${props => props.theme.colors.danger};
  padding: 0.75rem 1rem;
  margin: 0.75rem 1.5rem 0;
  border-radius: ${props => props.theme.borderRadius.md};
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const PlansContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
`;

const PlanOption = styled.div<{ selected: boolean }>`
  position: relative;
  background-color: ${props => props.selected 
    ? props.theme.colors.primary + '20' 
    : props.theme.colors.backgroundAlt};
  border: 2px solid ${props => props.selected 
    ? props.theme.colors.primary 
    : 'transparent'};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.selected 
      ? props.theme.colors.primary + '30' 
      : props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const SelectedCheckmark = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  color: ${props => props.theme.colors.primary};
  font-size: 1.2rem;
`;

const PlanOptionContent = styled.div`
  padding-top: 0.5rem;
`;

const PlanOptionName = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: 0.5rem;
`;

const PlanOptionPrice = styled.div`
  color: ${props => props.theme.colors.textDim};
  font-size: ${props => props.theme.typography.fontSize.sm};
  margin-bottom: 0.75rem;
`;

const PlanOptionDetails = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.text};
`;

const DurationSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const DurationOption = styled.div<{ selected: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.selected 
    ? props.theme.colors.primary 
    : props.theme.colors.backgroundAlt};
  color: ${props => props.selected ? 'white' : props.theme.colors.text};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.selected 
      ? props.theme.colors.primary 
      : props.theme.colors.backgroundAltHover};
    transform: translateY(-2px);
  }
`;

const CurrentPlanSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.75rem 0;
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const PlanCard = styled.div`
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 1rem;
`;

const PlanName = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: 0.75rem;
  font-size: ${props => props.theme.typography.fontSize.lg};
`;

const PlanDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PlanDetail = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

const DetailLabel = styled.span`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textDim};
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.backgroundAlt};
  }
`;

const AssignButton = styled(Button)`
  background-color: ${props => props.theme.colors.primary};
  border: none;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryHover || props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

export default UserPlanDialog;
