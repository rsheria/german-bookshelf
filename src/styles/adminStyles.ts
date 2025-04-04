import styled from 'styled-components';
import theme from './theme';
import darkTheme from './darkTheme';

// Admin Page Container
export const AdminContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${theme.spacing.xl} ${theme.spacing.md};
  
  @media (max-width: 768px) {
    padding: ${theme.spacing.lg} ${theme.spacing.sm};
  }
`;

// Admin Page Header
export const AdminHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -${theme.spacing.sm};
    left: 0;
    width: 80px;
    height: 3px;
    background-color: ${theme.colors.secondary};
    border-radius: ${theme.borderRadius.full};
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.secondary};
    }
  }
`;

export const AdminTitle = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  color: ${theme.colors.primary};
  margin: 0 0 ${theme.spacing.sm} 0;
  font-family: ${theme.typography.fontFamily.heading};
  font-weight: ${theme.typography.fontWeight.bold};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.primary};
  }
`;

export const AdminSubtitle = styled.p`
  color: ${theme.colors.textLight};
  margin: 0;
  font-size: ${theme.typography.fontSize.lg};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.textLight};
  }
`;

// Stats Grid
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

export const StatCard = styled.div`
  background-color: ${theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid ${theme.colors.border};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadows.lg};
    border-color: ${theme.colors.secondary};
  }
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.card};
    border-color: ${darkTheme.colors.border};
    
    &:hover {
      box-shadow: ${darkTheme.shadows.lg};
      border-color: ${darkTheme.colors.secondary};
    }
  }
`;

export const StatTitle = styled.div`
  font-size: ${theme.typography.fontSize.md};
  color: ${theme.colors.textLight};
  margin-bottom: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.textLight};
  }
  
  svg {
    color: ${theme.colors.secondary};
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.secondary};
    }
  }
`;

export const StatValue = styled.div`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  font-family: ${theme.typography.fontFamily.heading};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.primary};
  }
`;

// Action Buttons
export const ButtonsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.xl};
`;

export const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${theme.shadows.sm};
  
  &:hover {
    background-color: ${theme.colors.primaryDark};
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.md};
  }
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.primary};
    
    &:hover {
      background-color: ${darkTheme.colors.primaryDark};
    }
  }
  
  &.secondary {
    background-color: ${theme.colors.secondary};
    
    &:hover {
      background-color: ${theme.colors.secondaryDark};
    }
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.secondary};
      
      &:hover {
        background-color: ${darkTheme.colors.secondaryDark};
      }
    }
  }
  
  &.danger {
    background-color: ${theme.colors.error};
    
    &:hover {
      background-color: #d32f2f;
    }
  }
  
  &.ghost {
    background-color: transparent;
    color: ${theme.colors.primary};
    box-shadow: none;
    
    &:hover {
      background-color: rgba(45, 84, 112, 0.05);
      transform: translateY(-2px);
    }
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
      
      &:hover {
        background-color: rgba(133, 168, 197, 0.1);
      }
    }
  }
  
  &.outline {
    background-color: transparent;
    color: ${theme.colors.primary};
    border: 1px solid ${theme.colors.primary};
    box-shadow: none;
    
    &:hover {
      background-color: rgba(45, 84, 112, 0.05);
      transform: translateY(-2px);
    }
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
      border-color: ${darkTheme.colors.primary};
      
      &:hover {
        background-color: rgba(133, 168, 197, 0.1);
      }
    }
  }
`;

// Section styles
export const SectionTitle = styled.h2`
  font-size: ${theme.typography.fontSize['2xl']};
  color: ${theme.colors.primary};
  margin: ${theme.spacing.lg} 0 ${theme.spacing.md} 0;
  font-family: ${theme.typography.fontFamily.heading};
  font-weight: ${theme.typography.fontWeight.semibold};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.primary};
  }
`;

// Table styles
export const TableContainer = styled.div`
  background-color: ${theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.md};
  overflow: hidden;
  border: 1px solid ${theme.colors.border};
  transition: all 0.3s ease;
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.card};
    border-color: ${darkTheme.colors.border};
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHead = styled.thead`
  background-color: ${theme.colors.backgroundAlt};
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.backgroundAlt};
  }
`;

export const TableRow = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.border};
  }
  
  body[data-theme='dark'] & {
    &:not(:last-child) {
      border-bottom: 1px solid ${darkTheme.colors.border};
    }
  }
  
  &:hover {
    background-color: ${theme.colors.backgroundAlt}50;
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.backgroundAlt}50;
    }
  }
`;

export const TableHeader = styled.th`
  text-align: left;
  padding: ${theme.spacing.md};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.primary};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.primary};
  }
`;

export const TableCell = styled.td`
  padding: ${theme.spacing.md};
  color: ${theme.colors.text};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.text};
  }
`;

// Action buttons in tables
export const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
`;

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${theme.colors.background};
  color: ${theme.colors.primary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${theme.colors.primary};
    color: white;
    transform: translateY(-2px);
  }
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.background};
    color: ${darkTheme.colors.primary};
    border-color: ${darkTheme.colors.border};
    
    &:hover {
      background-color: ${darkTheme.colors.primary};
      color: white;
    }
  }
  
  &.edit {
    color: ${theme.colors.primary};
    
    &:hover {
      background-color: ${theme.colors.primary};
      color: white;
    }
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
      
      &:hover {
        background-color: ${darkTheme.colors.primary};
      }
    }
  }
  
  &.delete {
    color: ${theme.colors.error};
    
    &:hover {
      background-color: ${theme.colors.error};
      color: white;
    }
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.error};
      
      &:hover {
        background-color: ${darkTheme.colors.error};
      }
    }
  }
  
  &.view {
    color: ${theme.colors.secondary};
    
    &:hover {
      background-color: ${theme.colors.secondary};
      color: white;
    }
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.secondary};
      
      &:hover {
        background-color: ${darkTheme.colors.secondary};
      }
    }
  }
`;

// Pagination
export const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.lg};
`;

export const PageButton = styled.button<{ active?: boolean }>`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border: 1px solid ${props => props.active ? theme.colors.primary : theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background-color: ${props => props.active ? theme.colors.primary : theme.colors.card};
  color: ${props => props.active ? 'white' : theme.colors.text};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? theme.colors.primaryDark : theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }
  
  &:disabled {
    background-color: ${theme.colors.backgroundAlt};
    color: ${theme.colors.textLight};
    cursor: not-allowed;
    transform: none;
  }
  
  body[data-theme='dark'] & {
    border-color: ${props => props.active ? darkTheme.colors.primary : darkTheme.colors.border};
    background-color: ${props => props.active ? darkTheme.colors.primary : darkTheme.colors.card};
    color: ${props => props.active ? 'white' : darkTheme.colors.text};
    
    &:hover {
      background-color: ${props => props.active ? darkTheme.colors.primaryDark : darkTheme.colors.backgroundAlt};
    }
    
    &:disabled {
      background-color: ${darkTheme.colors.backgroundAlt};
      color: ${darkTheme.colors.textLight};
    }
  }
`;

// Search and Filter controls
export const ControlsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  flex-wrap: wrap;
  align-items: center;
`;

export const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background-color: ${theme.colors.card};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: 0 ${theme.spacing.md};
  flex-grow: 1;
  max-width: 400px;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.outline};
  }
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.card};
    border-color: ${darkTheme.colors.border};
    
    &:focus-within {
      border-color: ${darkTheme.colors.primary};
      box-shadow: ${darkTheme.shadows.outline};
    }
  }
  
  svg {
    color: ${theme.colors.textLight};
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.textLight};
    }
  }
`;

export const SearchInput = styled.input`
  border: none;
  background: transparent;
  padding: ${theme.spacing.sm} 0;
  outline: none;
  font-size: ${theme.typography.fontSize.md};
  width: 100%;
  color: ${theme.colors.text};
  
  &::placeholder {
    color: ${theme.colors.textLight};
    opacity: 0.7;
  }
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.text};
    
    &::placeholder {
      color: ${darkTheme.colors.textLight};
    }
  }
`;

export const FilterDropdown = styled.select`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.card};
  font-size: ${theme.typography.fontSize.md};
  outline: none;
  cursor: pointer;
  color: ${theme.colors.text};
  transition: all 0.3s ease;
  
  &:focus {
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.outline};
  }
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.card};
    border-color: ${darkTheme.colors.border};
    color: ${darkTheme.colors.text};
    
    &:focus {
      border-color: ${darkTheme.colors.primary};
      box-shadow: ${darkTheme.shadows.outline};
    }
  }
`;

// Loading and Empty states
export const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textLight};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.textLight};
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textLight};
  background-color: ${theme.colors.backgroundAlt};
  border-radius: ${theme.borderRadius.lg};
  border: 1px dashed ${theme.colors.border};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.textLight};
    background-color: ${darkTheme.colors.backgroundAlt};
    border-color: ${darkTheme.colors.border};
  }
`;

// Modal styles
export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

export const ModalContent = styled.div`
  background-color: ${theme.colors.card};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.xl};
  padding: ${theme.spacing.xl};
  width: 100%;
  max-width: 500px;
  border: 1px solid ${theme.colors.border};
  
  body[data-theme='dark'] & {
    background-color: ${darkTheme.colors.card};
    border-color: ${darkTheme.colors.border};
  }
`;

export const ModalTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  color: ${theme.colors.primary};
  margin: 0 0 ${theme.spacing.md} 0;
  font-family: ${theme.typography.fontFamily.heading};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.primary};
  }
`;

export const ModalText = styled.p`
  color: ${theme.colors.text};
  margin-bottom: ${theme.spacing.lg};
  
  body[data-theme='dark'] & {
    color: ${darkTheme.colors.text};
  }
`;

export const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.md};
`;

export const CancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.card};
  color: ${theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${theme.colors.backgroundAlt};
    transform: translateY(-2px);
  }
  
  body[data-theme='dark'] & {
    border-color: ${darkTheme.colors.border};
    background-color: ${darkTheme.colors.card};
    color: ${darkTheme.colors.text};
    
    &:hover {
      background-color: ${darkTheme.colors.backgroundAlt};
    }
  }
`;

export const ConfirmButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border: none;
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.error};
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #d32f2f;
    transform: translateY(-2px);
  }
`;

// Alert styles
export const Alert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background-color: #fff3e0;
  color: #e65100;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.lg};
  border-left: 4px solid #e65100;
  
  &.error {
    background-color: #fdecea;
    color: #d32f2f;
    border-left-color: #d32f2f;
  }
  
  &.success {
    background-color: #e8f5e9;
    color: #2e7d32;
    border-left-color: #2e7d32;
  }
  
  &.info {
    background-color: #e1f5fe;
    color: #0288d1;
    border-left-color: #0288d1;
  }
  
  body[data-theme='dark'] & {
    background-color: rgba(230, 81, 0, 0.1);
    
    &.error {
      background-color: rgba(211, 47, 47, 0.1);
    }
    
    &.success {
      background-color: rgba(46, 125, 50, 0.1);
    }
    
    &.info {
      background-color: rgba(2, 136, 209, 0.1);
    }
  }
`;

// Badge styles
export const Badge = styled.span<{ variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  
  /* Default - primary */
  background-color: ${props => 
    props.variant === 'secondary' ? theme.colors.secondary + '20' :
    props.variant === 'success' ? theme.colors.success + '20' :
    props.variant === 'warning' ? theme.colors.warning + '20' :
    props.variant === 'error' ? theme.colors.error + '20' :
    theme.colors.primary + '20'
  };
  
  color: ${props => 
    props.variant === 'secondary' ? theme.colors.secondary :
    props.variant === 'success' ? theme.colors.success :
    props.variant === 'warning' ? theme.colors.warning :
    props.variant === 'error' ? theme.colors.error :
    theme.colors.primary
  };
  
  body[data-theme='dark'] & {
    background-color: ${props => 
      props.variant === 'secondary' ? darkTheme.colors.secondary + '20' :
      props.variant === 'success' ? darkTheme.colors.success + '20' :
      props.variant === 'warning' ? darkTheme.colors.warning + '20' :
      props.variant === 'error' ? darkTheme.colors.error + '20' :
      darkTheme.colors.primary + '20'
    };
    
    color: ${props => 
      props.variant === 'secondary' ? darkTheme.colors.secondary :
      props.variant === 'success' ? darkTheme.colors.success :
      props.variant === 'warning' ? darkTheme.colors.warning :
      props.variant === 'error' ? darkTheme.colors.error :
      darkTheme.colors.primary
    };
  }
`;
