import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { storeCredentials } from '../services/refreshBypass';
import { useAuth } from '../context/AuthContext';
import Input from './common/Input';
import AnimatedSubmitButton from './common/AnimatedSubmitButton';

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

const ErrorMessage = styled.div`
  color: #721c24;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #d4edda;
  color: #155724;
  padding: 0.75rem;
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

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error.message || 'Login failed');
      } else {
        storeCredentials(email, password);
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer>
      <Title>{t('auth.loginTitle')}</Title>
      
      {error && (
        <ErrorMessage>
          <FiAlertCircle /> 
          {error}
        </ErrorMessage>
      )}
      
      {isSuccess && (
        <SuccessMessage>
          <FiCheckCircle />
          {t('auth.loginSuccess')}
        </SuccessMessage>
      )}
      
      <Input placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
      <AnimatedSubmitButton label={t('auth.loginButton')} isLoading={isLoading} isSuccess={isSuccess} isError={!!error} onClick={handleSubmit} />
      
      <LinkText>
        {t('auth.noAccount')} <StyledLink to="/signup">{t('auth.signupButton')}</StyledLink>
      </LinkText>
    </FormContainer>
  );
};

export default LoginForm;
