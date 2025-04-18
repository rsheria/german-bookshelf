// src/components/admin/CategoryManagementPanel.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Category,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  blacklistCategory,
  detectAndAddNewCategories,
} from '../../services/categoryService';
import { supabase } from '../../services/supabase';
import styled from 'styled-components';

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const PanelContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};

  h2 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const ActionsRow = styled(Box)`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FormRow = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CategoryManagementPanel: React.FC = () => {
  const { t } = useTranslation();

  // Main data & UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoDetectLoading, setAutoDetectLoading] = useState(false);
  const [showBlacklisted, setShowBlacklisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add / Edit state
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    type: 'ebook',
    fictionType: 'Fiction',
    parent_id: null,
    blacklisted: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto‑dismiss success
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Initial table check
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { error: tableErr } = await supabase.from('categories').select('*').limit(1);
        if (tableErr) {
          // create if missing
          const { error: createErr } = await supabase.from('categories').insert([{
            name: 'Example Category',
            type: 'ebook',
            fictionType: 'Fiction',
            blacklisted: false,
          }]);
          if (createErr) {
            setError(t('admin.categories.tableCreateError', 'Failed to create categories table.'));
          } else {
            setSuccessMessage(t('admin.categories.tableCreated', 'Categories table created successfully!'));
            await fetchCategories();
          }
        } else {
          await fetchCategories();
        }
      } catch (e) {
        setError(t('admin.categories.tableError', 'Error checking categories table.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Refetch when toggling blacklisted view
  useEffect(() => {
    fetchCategories();
  }, [showBlacklisted]);

  // Fetch helper
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getAllCategories(true);
      const list = showBlacklisted ? data : data.filter(cat => !cat.blacklisted);
      setCategories(list);
      setError(null);
    } catch {
      setError(t('admin.categories.fetchError', 'Failed to fetch categories.'));
    } finally {
      setLoading(false);
    }
  };

  // Add
  const handleAddCategory = async () => {
    if (!newCategory.name?.trim()) {
      setError(t('admin.categories.nameRequired', 'Category name is required.'));
      return;
    }
    setLoading(true);
    try {
      const created = await createCategory(newCategory as Category);
      setCategories([...categories, created]);
      setNewCategory({ name: '', type: 'ebook', fictionType: 'Fiction', parent_id: null, blacklisted: false });
      setIsAdding(false);
      setError(null);
      setSuccessMessage(t('admin.categories.addSuccess', 'Category added successfully.'));
    } catch {
      setError(t('admin.categories.addError', 'Failed to add category.'));
    } finally {
      setLoading(false);
    }
  };

  // Edit
  const handleUpdateCategory = async (id: string) => {
    const current = categories.find(c => c.id === id);
    if (!current) return;
    setLoading(true);
    try {
      const updated = await updateCategory(id, current);
      setCategories(categories.map(c => (c.id === id ? updated : c)));
      setEditingId(null);
      setError(null);
      setSuccessMessage(t('admin.categories.updateSuccess', 'Category updated successfully.'));
    } catch {
      setError(t('admin.categories.updateError', 'Failed to update category.'));
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('admin.categories.confirmDelete', 'Are you sure you want to delete this category?'))) {
      return;
    }
    setLoading(true);
    try {
      await deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      setError(null);
      setSuccessMessage(t('admin.categories.deleteSuccess', 'Category deleted successfully.'));
    } catch {
      setError(t('admin.categories.deleteError', 'Failed to delete category.'));
    } finally {
      setLoading(false);
    }
  };

  // Blacklist toggle
  const handleBlacklistCategory = async (id: string, currentlyBlacklisted: boolean) => {
    setLoading(true);
    try {
      const updated = await blacklistCategory(id, !currentlyBlacklisted);
      setCategories(categories.map(c => (c.id === id ? updated : c)));
      setError(null);
      setSuccessMessage(
        currentlyBlacklisted
          ? t('admin.categories.visibleSuccess', 'Category is now visible.')
          : t('admin.categories.blacklistSuccess', 'Category is now blacklisted.')
      );
      await fetchCategories();
    } catch {
      setError(t('admin.categories.blacklistError', 'Failed to update category visibility.'));
    } finally {
      setLoading(false);
    }
  };

  // Auto‑detect
  const handleAutoDetectCategories = async () => {
    setAutoDetectLoading(true);
    setSuccessMessage(t('admin.categories.autoDetectStarted', 'Auto‑detecting categories…'));
    try {
      const res = await detectAndAddNewCategories();
      setSuccessMessage(res.message);
      await fetchCategories();
    } catch {
      setError(t('admin.categories.autoDetectError', 'Failed to auto‑detect categories.'));
    } finally {
      setAutoDetectLoading(false);
    }
  };

  // Cancel edit/add
  const cancelEditing = () => {
    setEditingId(null);
    setIsAdding(false);
    setError(null);
  };

  return (
    <PanelContainer>
      <PanelHeader>
        <Typography component="h2">
          {t('admin.categories.title', 'Category Management')}
        </Typography>
        <ActionsRow>
          <Button
            variant="contained"
            color={showBlacklisted ? 'secondary' : 'primary'}
            startIcon={showBlacklisted ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setShowBlacklisted(!showBlacklisted)}
          >
            {showBlacklisted
              ? t('admin.categories.hideBlacklisted', 'Hide Blacklisted')
              : t('admin.categories.showBlacklisted', 'Show Blacklisted')}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={autoDetectLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={handleAutoDetectCategories}
            disabled={autoDetectLoading}
          >
            {autoDetectLoading
              ? t('admin.categories.autoDetectLoading', 'Detecting…')
              : t('admin.categories.autoDetect', 'Auto‑Detect')}
          </Button>
        </ActionsRow>
      </PanelHeader>

      {successMessage && (
        <Typography color="success.main" mb={2}>
          {successMessage}
        </Typography>
      )}
      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      <Box mb={2}>
        {isAdding ? (
          <FormRow>
            <TextField
              label={t('admin.categories.categoryName', 'Name')}
              value={newCategory.name}
              onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Select
              value={newCategory.type}
              onChange={e => setNewCategory({ ...newCategory, type: e.target.value as any })}
            >
              <MenuItem value="ebook">{t('admin.categories.eBook', 'eBook')}</MenuItem>
              <MenuItem value="audiobook">{t('admin.categories.audiobook', 'Audiobook')}</MenuItem>
            </Select>
            <Select
              value={newCategory.fictionType}
              onChange={e => setNewCategory({ ...newCategory, fictionType: e.target.value as any })}
            >
              <MenuItem value="Fiction">{t('admin.categories.fiction', 'Fiction')}</MenuItem>
              <MenuItem value="Non-Fiction">{t('admin.categories.nonFiction', 'Non‑Fiction')}</MenuItem>
            </Select>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleAddCategory}
            >
              {t('common.save', 'Save')}
            </Button>
            <Button
              variant="text"
              color="inherit"
              startIcon={<CancelIcon />}
              onClick={cancelEditing}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </FormRow>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsAdding(true)}
          >
            {t('admin.categories.addCategory', 'Add Category')}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.categories.categoryName', 'Name')}</TableCell>
              <TableCell>{t('admin.categories.type', 'Type')}</TableCell>
              <TableCell>{t('admin.categories.fiction', 'Fiction')}</TableCell>
              <TableCell>{t('admin.categories.bookCount', 'Count')}</TableCell>
              <TableCell>{t('admin.categories.status', 'Status')}</TableCell>
              <TableCell align="right">{t('admin.categories.actions', 'Actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(cat => {
              const isEditing = editingId === cat.id;
              return (
                <TableRow key={cat.id} hover>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        value={cat.name}
                        onChange={e => {
                          const updated = categories.map(c =>
                            c.id === cat.id ? { ...c, name: e.target.value } : c
                          );
                          setCategories(updated);
                        }}
                      />
                    ) : (
                      cat.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={cat.type}
                        onChange={e => {
                          const updated = categories.map(c =>
                            c.id === cat.id ? { ...c, type: e.target.value as any } : c
                          );
                          setCategories(updated);
                        }}
                      >
                        <MenuItem value="ebook">eBook</MenuItem>
                        <MenuItem value="audiobook">Audiobook</MenuItem>
                      </Select>
                    ) : (
                      cat.type === 'ebook' ? 'eBook' : 'Audiobook'
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={cat.fictionType}
                        onChange={e => {
                          const updated = categories.map(c =>
                            c.id === cat.id ? { ...c, fictionType: e.target.value as any } : c
                          );
                          setCategories(updated);
                        }}
                      >
                        <MenuItem value="Fiction">Fiction</MenuItem>
                        <MenuItem value="Non-Fiction">Non‑Fiction</MenuItem>
                      </Select>
                    ) : (
                      cat.fictionType
                    )}
                  </TableCell>
                  <TableCell>{cat.count || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={cat.blacklisted ? t('admin.categories.blacklisted', 'Blacklisted') : t('admin.categories.visible', 'Visible')}
                      color={cat.blacklisted ? 'error' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <>
                        <IconButton onClick={() => handleUpdateCategory(cat.id!)} size="small">
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={cancelEditing} size="small">
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => setEditingId(cat.id!)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleBlacklistCategory(cat.id!, cat.blacklisted!)}
                          size="small"
                          color={cat.blacklisted ? 'primary' : 'default'}
                        >
                          {cat.blacklisted ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                        <IconButton onClick={() => handleDeleteCategory(cat.id!)} size="small" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box textAlign="center" marginTop={2}>
          <CircularProgress />
        </Box>
      )}
    </PanelContainer>
  );
};

export default CategoryManagementPanel;
