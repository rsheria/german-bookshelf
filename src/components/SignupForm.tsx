import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { supabase, signUp } from '../services/supabase';

const FormContainer = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  margin: 0 0 1.5rem 0;
  text-align: center;
  color: #2c3e50;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 1rem;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #3498db;
  }
`;

const Input = styled.input`
  flex-grow: 1;
  border: none;
  padding: 0.75rem 0;
  outline: none;
  font-size: 1rem;
`;

const IconWrapper = styled.div`
  color: #95a5a6;
  margin-right: 0.5rem;
`;

const Button = styled.button`
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #28a745;
  font-weight: 500;
  line-height: 1.5;
`;

const LinkText = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #666;
`;

const StyledLink = styled(Link)`
  color: #3498db;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const SignupForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [referral, setReferral] = useState(params.get('ref') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch') || 'Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Sign up the user
      const { data, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // Resolve referral code to referrer ID and initial count
        let referredById: string | undefined;
        let initialRefCount: number | undefined;
        if (referral) {
          const { data: refProfile, error: refErr } = await supabase
            .from('profiles')
            .select('id, referrals_count')
            .eq('referral_code', referral)
            .single();
          if (!refErr && refProfile) {
            referredById = refProfile.id;
            initialRefCount = refProfile.referrals_count;
          } else {
            console.warn('Invalid referral code:', referral);
          }
        }
        // Create user profile
        const profileData: any = {
          id: data.user.id,
          username,
          is_admin: false,
          daily_quota: 3,
          ...(referredById ? { referred_by: referredById } : {})
        };
        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);
        if (profileError) throw profileError;
        // Increment referrer's count
        if (referredById && initialRefCount !== undefined) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referrals_count: initialRefCount + 1 })
            .eq('id', referredById);
          if (updateError) console.warn('Error updating referral count:', updateError);
        }

        setSuccess(t('auth.signupSuccess') || 'Signup successful! Please check your email to confirm your account.');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      // More user-friendly error messages
      if ((err as Error).message.includes('duplicate key value violates unique constraint')) {
        setSuccess(t('auth.emailConfirmation') || 'Account created! Please check your email to confirm your registration.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>{t('auth.signupTitle')}</Title>
      
      {error && (
        <ErrorMessage>
          <FiAlertCircle />
          {error}
        </ErrorMessage>
      )}
      
      {success && (
        <SuccessMessage>
          <FiCheckCircle />
          {success}
        </SuccessMessage>
      )}
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="referral">{t('auth.referralCode', 'Referral Code')}</Label>
          <InputWrapper>
            <Input
              id="referral"
              type="text"
              placeholder={t('auth.referralPlaceholder', 'Enter referral code (optional)')}
              value={referral}
              onChange={e => setReferral(e.target.value)}
            />
          </InputWrapper>
        </FormGroup>
        <FormGroup>
          <Label htmlFor="email">{t('auth.email')}</Label>
          <InputWrapper>
            <IconWrapper>
              <FiMail />
            </IconWrapper>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </InputWrapper>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="username">{t('auth.username')}</Label>
          <InputWrapper>
            <IconWrapper>
              <FiUser />
            </IconWrapper>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </InputWrapper>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="password">{t('auth.password')}</Label>
          <InputWrapper>
            <IconWrapper>
              <FiLock />
            </IconWrapper>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </InputWrapper>
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
          <InputWrapper>
            <IconWrapper>
              <FiLock />
            </IconWrapper>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </InputWrapper>
        </FormGroup>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('auth.signupButton')}
        </Button>
      </Form>
      
      <LinkText>
        {t('auth.haveAccount')} <StyledLink to="/login">{t('auth.loginButton')}</StyledLink>
      </LinkText>
    </FormContainer>
  );
};

export default SignupForm;
