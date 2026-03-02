import { useParams, Link } from 'react-router-dom';
import { albumsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import './RoundDetail.css';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 10;

export default function RoundDetail() {
  const { roundId } = useParams<{ roundId: string }>();
  const { user } = useAuth();
  const [round, setRound] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState<any>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!roundId) return;
    albumsApi.getRound(roundId).then(setRound).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [roundId]);

  const myAlbum = round?.albums?.find((a: any) => a.user_id === user?.id);
  const hasSubmitted = !!myAlbum;
  const timeLeft = round ? Math.max(0, round.time_remaining_ms) : 0;
  const ended = timeLeft === 0;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length < MIN_PHOTOS || files.length > MAX_PHOTOS) {
      alert(`Select between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos`);
      return;
    }
    setUploading(true);
    try {
      await albumsApi.uploadAlbum(roundId!, files);
      load();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const vote = async (albumId: string, stars: number) => {
    try {
      await albumsApi.vote(albumId, stars);
      load();
    } catch {}
  };

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (loading || !round) {
    return <p className="text-muted">Loading...</p>;
  }

  return (
    <div className="round-detail-page">
      <div className="round-header">
        <Link to="/groups" className="back">← Back</Link>
        <h1>Album Round</h1>
        <p className="countdown">
          {ended ? 'Round ended' : `⏱ ${formatTime(timeLeft)} left`}
        </p>
      </div>

      {!hasSubmitted && !ended && (
        <div className="upload-zone">
          <p>Submit your album ({MIN_PHOTOS}–{MAX_PHOTOS} photos)</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Choose Photos'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            hidden
          />
        </div>
      )}

      {hasSubmitted && (
        <p className="submitted-badge">✓ You submitted your album</p>
      )}

      <div className="albums-list">
        <h3>Albums</h3>
        {round.albums?.length ? (
          round.albums.map((a: any) => (
            <div key={a.id} className="album-row">
              <div className="album-preview" onClick={() => setViewingAlbum(a)}>
                {a.photos?.[0]?.url ? (
                  <img src={a.photos[0].url} alt="" />
                ) : (
                  <span>📷</span>
                )}
              </div>
              <div className="album-info">
                <span>{a.username || 'Anonymous'}</span>
                <span className="star-count">★ {a.star_count || 0}</span>
              </div>
              {a.user_id !== user?.id && (
                <div className="vote-stars">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      className={a.user_vote === s ? 'active' : ''}
                      onClick={() => vote(a.id, s)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-muted">No albums yet.</p>
        )}
      </div>

      {viewingAlbum && (
        <div className="lightbox" onClick={() => setViewingAlbum(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span>{viewingAlbum.username || 'Anonymous'}</span>
              <button onClick={() => setViewingAlbum(null)}>×</button>
            </div>
            <div className="slide-container">
              <img src={viewingAlbum.photos?.[slideIndex]?.url} alt="" />
              <button
                className="nav prev"
                onClick={(e) => { e.stopPropagation(); setSlideIndex((i) => Math.max(0, i - 1)); }}
                disabled={slideIndex === 0}
              >
                ‹
              </button>
              <button
                className="nav next"
                onClick={(e) => { e.stopPropagation(); setSlideIndex((i) => Math.min((viewingAlbum.photos?.length || 1) - 1, i + 1)); }}
                disabled={slideIndex >= (viewingAlbum.photos?.length || 1) - 1}
              >
                ›
              </button>
            </div>
            <p className="slide-counter">{slideIndex + 1} / {viewingAlbum.photos?.length || 1}</p>
          </div>
        </div>
      )}
    </div>
  );
}
