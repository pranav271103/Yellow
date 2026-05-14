import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ConnectionIndicator from '../components/ConnectionIndicator';
import {
  DiscordBanner,
  EarlyBirdyBanner,
  PromotionalCreditsBanner,
  UsageLimitBanner,
} from '../components/home/HomeBanners';
import { dismissBanner, shouldShowBanner } from '../components/upsell/upsellDismissState';
import { useUser } from '../hooks/useUser';
import { useAppSelector } from '../store/hooks';
import { selectSocketStatus } from '../store/socketSelectors';
import { APP_VERSION } from '../utils/config';



const Home = () => {
  const { user } = useUser();
  const navigate = useNavigate();


  // Early birdy banner: once dismissed it stays gone (cooldown longer than any realistic session).
  const [showEarlyBirdy, setShowEarlyBirdy] = useState(() =>
    shouldShowBanner('home-earlybirdy', Number.MAX_SAFE_INTEGER)
  );

  const handleDismissEarlyBirdy = () => {
    dismissBanner('home-earlybirdy');
    setShowEarlyBirdy(false);
  };

  const welcomeVariants = useMemo(
    () => ["YellowBot is online ⚡", "Ready to serve 🤖", "System Connected ✅"],
    []
  );
  const [welcomeVariantIndex, setWelcomeVariantIndex] = useState(0);
  const [typedWelcome, setTypedWelcome] = useState('');
  const [isDeletingWelcome, setIsDeletingWelcome] = useState(false);
  // Mirror the same socket status the `ConnectionIndicator` pill consumes
  // so the description copy below the pill never contradicts it (the old
  // hard-coded "connected" message lied while the pill said "Connecting"
  // / "Disconnected").
  const socketStatus = useAppSelector(selectSocketStatus);
  const statusCopy = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  }[socketStatus];

  // Open in-app chat.
  const handleStartCooking = async () => {
    navigate('/chat');
  };

  useEffect(() => {
    const activeVariant = welcomeVariants[welcomeVariantIndex] ?? '';
    const isFullyTyped = typedWelcome === activeVariant;
    const isFullyDeleted = typedWelcome.length === 0;

    const delay = isDeletingWelcome
      ? 36
      : isFullyTyped
        ? 1400
        : typedWelcome.length === 0
          ? 250
          : 55;

    const timeoutId = window.setTimeout(() => {
      if (!isDeletingWelcome) {
        if (isFullyTyped) {
          setIsDeletingWelcome(true);
          return;
        }

        setTypedWelcome(activeVariant.slice(0, typedWelcome.length + 1));
        return;
      }

      if (!isFullyDeleted) {
        setTypedWelcome(activeVariant.slice(0, typedWelcome.length - 1));
        return;
      }

      setIsDeletingWelcome(false);
      setWelcomeVariantIndex(current => (current + 1) % welcomeVariants.length);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [isDeletingWelcome, typedWelcome, welcomeVariantIndex, welcomeVariants]);

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main card — data-walkthrough target for step 1 */}
        <div
          data-walkthrough="home-card"
          className="bg-white rounded-2xl shadow-soft border border-stone-200 p-6 animate-fade-up">
          {/* Header row: logo + version + settings */}
          <div className="flex items-center justify-center mb-4">
            <span className="text-xs text-center text-stone-400 font-medium tracking-wider uppercase">Yellow {APP_VERSION}</span>
          </div>

          {/* Welcome title */}
          <h1 className="min-h-[3.5rem] text-32l font-bold text-stone-900 text-center">
            {typedWelcome}
            <span aria-hidden="true" className="ml-0.5 inline-block text-primary-500 animate-pulse">
              |
            </span>
          </h1>

          {/* Connection status */}
          <div className="flex justify-center mb-3">
            <ConnectionIndicator />
          </div>

          {/* Description — mirrors the pill's socket status to avoid
              telling the user they're connected while the pill shows
              "Connecting" / "Disconnected". */}
          <p className="text-sm text-stone-500 text-center mb-6 leading-relaxed">{statusCopy}</p>

          {/* CTA button — data-walkthrough target for step 2 */}
          <button
            data-walkthrough="home-cta"
            onClick={handleStartCooking}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]">
            Message YellowBot
          </button>
        </div>

        {showEarlyBirdy && <EarlyBirdyBanner onDismiss={handleDismissEarlyBirdy} />}

        {/* Next steps — compact directory of where to go next */}
        {/* <div className="mt-3 bg-white rounded-2xl shadow-soft border border-stone-200 p-4">
          <div className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">Next steps</div>
          <div className="divide-y divide-stone-100">
            <button
              onClick={() => navigate('/skills')}
              className="w-full flex items-center justify-between py-2.5 text-left hover:bg-stone-50 rounded-md px-2 -mx-2 transition-colors">
              <div>
                <div className="text-sm font-medium text-stone-900">Connect your services</div>
                <div className="text-xs text-stone-500">
                  Give your assistant access to Gmail, Calendar, and more.
                </div>
              </div>
              <svg
                className="w-4 h-4 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate('/rewards')}
              className="w-full flex items-center justify-between py-2.5 text-left hover:bg-stone-50 rounded-md px-2 -mx-2 transition-colors">
              <div>
                <div className="text-sm font-medium text-stone-900">Earn rewards</div>
                <div className="text-xs text-stone-500">
                  Unlock credits by using OpenHuman and completing milestones.
                </div>
              </div>
              <svg
                className="w-4 h-4 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate('/invites')}
              className="w-full flex items-center justify-between py-2.5 text-left hover:bg-stone-50 rounded-md px-2 -mx-2 transition-colors">
              <div>
                <div className="text-sm font-medium text-stone-900">Invite a friend</div>
                <div className="text-xs text-stone-500">
                  Share an invite — both of you get credits.
                </div>
              </div>
              <svg
                className="w-4 h-4 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Home;
