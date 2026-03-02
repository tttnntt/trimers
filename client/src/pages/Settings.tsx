import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usersApi } from '../api/client';
import './Settings.css';

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  usePushNotifications();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const words = bio.trim().split(/\s+/);
    if (bio.trim() && words.length > 1) {
      setError('Bio must be one word');
      return;
    }
    setLoading(true);
    try {
      await usersApi.updateProfile({ username: username.trim() || undefined, bio: bio.trim() || undefined });
      await refreshUser();
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <form onSubmit={handleSave} className="settings-form">
        {error && <div className="auth-error">{error}</div>}
        <div className="avatar-section">
          <div className="avatar-wrap" onClick={() => fileRef.current?.click()}>
            {user?.profile_picture ? (
              <img src={`/api/users/avatar`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span>{user?.username?.[0] || user?.email?.[0] || '?'}</span>
            )}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="link-btn">Change photo</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
        </div>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <label>Bio (one word)</label>
        <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" maxLength={30} />
        <button type="submit" disabled={loading} className="btn-primary">Save</button>
      </form>
      <button onClick={handleLogout} className="btn-logout">Sign out</button>
    </div>
  );
}
