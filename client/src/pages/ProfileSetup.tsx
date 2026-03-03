import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi, API_BASE } from '../api/client';
import './ProfileSetup.css';

export default function ProfileSetup() {
  const { user, refreshUser, setNeedsProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const bioWords = bio.trim().split(/\s+/);
    if (bioWords.length > 1) {
      setError('Bio must be one word');
      return;
    }
    setLoading(true);
    try {
      await usersApi.updateProfile({
        username: username.trim() || undefined,
        bio: bio.trim() || undefined
      });
      await refreshUser();
      setNeedsProfile(false);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await usersApi.uploadProfilePicture(file);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <h1>Customize your profile</h1>
        <p className="subtitle">Add your username and one-word bio</p>
        <form onSubmit={handleSubmit} className="profile-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="avatar-upload" onClick={() => fileRef.current?.click()}>
            {user?.profile_picture ? (
              <img src={`${API_BASE}/users/avatar`} alt="" /> 
            ) : (
              <span>+ Add photo</span>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
          </div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Bio (one word)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={30}
          />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
