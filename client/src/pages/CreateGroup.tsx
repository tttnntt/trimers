import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/client';
import './CreateGroup.css';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Group name required');
      return;
    }
    setLoading(true);
    try {
      const g = await groupsApi.create(name.trim());
      navigate(`/groups/${g.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-group-page">
      <h1>Create Group</h1>
      <form onSubmit={handleSubmit} className="create-form">
        {error && <div className="auth-error">{error}</div>}
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
        />
        <button type="submit" disabled={loading} className="btn-primary btn-full">
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
}
