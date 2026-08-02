import React, { useEffect, useState } from 'react';
import { getUserByHandle } from '../services/firebaseUtils';
import { UserProfile } from '../types';
import { injectZineSEO } from '../utils/seoHelper';
import {
  PublicField,
  MimiWordmark,
  ColumnRule,
  PressMark,
  PublicCTA,
} from './public-face';

const SEOInjector: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  injectZineSEO({
    title: `@${profile.handle}`,
    description: profile.tasteProfile?.semantic_signature || 'Aesthetic Profile',
    imageUrl:
      profile.photoURL ||
      'https://raw.githubusercontent.com/Aris-A-C/mimi-assets/main/mimi_logo_new.png',
    authorName: profile.handle,
    publishDate: new Date().toISOString(),
  });
  return null;
};

export const PublicSharePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const handle = window.location.pathname.split('/@')[1];

  useEffect(() => {
    const fetchProfile = async () => {
      if (handle) {
        const p = await getUserByHandle(handle);
        setProfile(p);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [handle]);

  if (loading) {
    return (
      <PublicField className="h-screen flex items-center justify-center font-serif italic text-[var(--mimi-stone)]">
        Manifesting…
      </PublicField>
    );
  }
  if (!profile) {
    return (
      <PublicField className="h-screen flex items-center justify-center font-serif italic text-[var(--mimi-stone)]">
        Registry not found.
      </PublicField>
    );
  }

  return (
    <PublicField className="min-h-screen p-8 md:p-16 flex flex-col items-center">
      <SEOInjector profile={profile} />
      <div className="max-w-2xl w-full space-y-10">
        <div className="space-y-4 text-center">
          <MimiWordmark size="sm" className="inline-block" />
          <h1 className="font-serif italic text-5xl text-[var(--mimi-ink)]">
            @{profile.handle}
          </h1>
          <PressMark label="Public stand" />
        </div>

        <ColumnRule />

        <div className="w-full space-y-6 py-2">
          <div>
            <h2 className="font-serif italic text-2xl text-[var(--mimi-ink)] mb-2">
              Aesthetic identity
            </h2>
            <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
              Semantic baseline
            </p>
          </div>

          {profile?.tasteProfile ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.22em] font-sans text-[var(--mimi-stone)] mb-3">
                  Dominant archetypes
                </h3>
                <p className="font-serif italic text-lg leading-relaxed">
                  {(profile.tasteProfile.dominant_archetypes || []).join(' · ') ||
                    'Awaiting approval'}
                </p>
              </div>
              {profile.tasteProfile.constraints &&
                profile.tasteProfile.constraints.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.22em] font-sans text-[var(--mimi-stone)] mb-3">
                      Constraints
                    </h3>
                    <p className="font-serif text-base text-[var(--mimi-stone)] leading-relaxed">
                      {profile.tasteProfile.constraints.join(' · ')}
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <p className="font-serif italic text-[var(--mimi-stone)]">
              No graph data detected.
            </p>
          )}
        </div>

        <ColumnRule />

        <div className="space-y-4">
          <h3 className="font-sans text-[10px] uppercase tracking-[0.28em] text-[var(--mimi-stone)]">
            Aesthetic profile
          </h3>
          <p className="font-serif italic text-[var(--mimi-ink)] leading-relaxed">
            {profile.tasteProfile?.semantic_signature ||
              'A private archive of approved taste — provenance intact.'}
          </p>
          <PublicCTA
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Enter Mimi
          </PublicCTA>
        </div>
      </div>
    </PublicField>
  );
};
