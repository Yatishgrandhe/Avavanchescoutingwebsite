import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Radio,
  Search,
  Users,
  X,
} from "lucide-react";
import styles from "@/styles/CompetitionHistory.module.css";

interface PastCompetition {
  id: string;
  competition_name: string;
  competition_key: string;
  competition_year: number;
  competition_location?: string;
  migrated_at: string;
  total_teams: number;
  total_matches: number;
  organization_name?: string | null;
  contributing_organization_names?: string[];
  is_multi_org?: boolean;
}

interface LiveEvent {
  event_key: string;
  competition_name: string;
  total_teams: number;
  total_matches: number;
  scouting_count: number;
  organization_name?: string | null;
  contributing_organization_names?: string[];
  is_multi_org?: boolean;
}

const MIN_LOADING_MS = 1400;

function liveHref(event: LiveEvent) {
  return `/view-data?event_key=${encodeURIComponent(event.event_key)}${event.is_multi_org ? "&see_all_orgs=1" : ""}`;
}

function archiveHref(competition: PastCompetition) {
  if (competition.is_multi_org) {
    return `/view-data?competition_key=${encodeURIComponent(competition.competition_key)}&year=${competition.competition_year}&see_all_orgs=1`;
  }
  return `/view-data?id=${encodeURIComponent(competition.id)}`;
}

function brandLabel(name?: string | null, multiple?: boolean) {
  return multiple ? "Multiple teams" : name || "Competition archive";
}

function HistoryLoader() {
  return (
    <motion.div
      key="history-loader"
      className={styles.loadingPage}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
      aria-label="Loading competition history"
    >
      <div className={styles.loadingInner}>
        <div className={styles.loadingMark}>
          <Image src="/image.png" alt="" width={116} height={116} priority />
        </div>
        <span className={styles.loadingLabel}>AVALANCHE / ARCHIVE</span>
        <div className={styles.loadingTrack}>
          <span />
        </div>
        <p>Gathering competition history</p>
      </div>
    </motion.div>
  );
}

export default function PublicCompetitionHistoryPage() {
  const reducedMotion = useReducedMotion();
  const [competitions, setCompetitions] = useState<PastCompetition[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setLoadError(false);
      const startedAt = performance.now();

      try {
        const response = await fetch("/api/past-competitions", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!cancelled) {
          setCompetitions(data.competitions || []);
          setLiveEvents(data.live || []);
        }
      } catch (error) {
        if (!controller.signal.aborted && !cancelled) {
          console.error("Error loading competitions:", error);
          setLoadError(true);
        }
      } finally {
        const reducedLoadingMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const remaining = reducedLoadingMotion
          ? 0
          : Math.max(0, MIN_LOADING_MS - (performance.now() - startedAt));
        await new Promise((resolve) => setTimeout(resolve, remaining));
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  const query = searchTerm.trim().toLowerCase();
  const filteredCompetitions = competitions.filter((competition) => {
    const searchable = [
      competition.competition_name,
      competition.competition_key,
      competition.competition_location || "",
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      (!yearFilter || String(competition.competition_year) === yearFilter)
    );
  });
  const uniqueYears = Array.from(
    new Set(competitions.map((competition) => competition.competition_year)),
  ).sort((a, b) => b - a);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <HistoryLoader key="loading" />
      ) : (
        <motion.div
          key="content"
          className={styles.page}
          initial={{
            opacity: reducedMotion ? 1 : 0,
            y: reducedMotion ? 0 : 16,
          }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.42, ease: "easeOut" }}
        >
          <header className={styles.header}>
            <div className={styles.headerInner}>
              <Link
                href="/"
                className={styles.brand}
                aria-label="Avalanche Scouting home"
              >
                <span className={styles.brandMark}>
                  <Image
                    src="/image.png"
                    alt=""
                    width={50}
                    height={50}
                    priority
                  />
                </span>
                <span>
                  <strong>AVALANCHE</strong>
                  <small>SCOUTING / 2724</small>
                </span>
              </Link>
              <Link href="/" className={styles.backLink}>
                <ArrowLeft size={18} /> <span>Back to home</span>
              </Link>
            </div>
          </header>

          <main className={styles.main}>
            <section className={styles.hero} aria-labelledby="history-title">
              <div className={styles.heroText}>
                <div className={styles.eyebrow}>
                  <span /> THE FIELD, ON RECORD
                </div>
                <h1 id="history-title">
                  Competition
                  <br />
                  <em>history.</em>
                </h1>
                <p>
                  Every event tells a story. Explore live scouting and past
                  competitions from the Avalanche archive.
                </p>
              </div>
              <div className={styles.heroSummary} aria-label="Archive summary">
                <div>
                  <span className={styles.summaryIcon}>
                    <Radio size={20} />
                  </span>
                  <strong>{liveEvents.length}</strong>
                  <span>
                    Live {liveEvents.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <div>
                  <span className={styles.summaryIcon}>
                    <Archive size={20} />
                  </span>
                  <strong>{competitions.length}</strong>
                  <span>
                    Past {competitions.length === 1 ? "event" : "events"}
                  </span>
                </div>
              </div>
            </section>

            {loadError && (
              <div className={styles.error} role="alert">
                <span>Competition history could not be loaded.</span>
                <button
                  type="button"
                  onClick={() => setReloadToken((current) => current + 1)}
                >
                  Try again <ArrowRight size={16} />
                </button>
              </div>
            )}

            {liveEvents.length > 0 && (
              <section className={styles.section} aria-labelledby="live-title">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionIndex}>
                      01 / CURRENT EVENT
                    </span>
                    <h2 id="live-title">
                      Live on the field <span className={styles.livePulse} />
                    </h2>
                  </div>
                  <p>Current scouting activity, as it happens.</p>
                </div>
                <div className={styles.liveGrid}>
                  {liveEvents.map((event) => (
                    <Link
                      href={liveHref(event)}
                      key={event.event_key}
                      className={styles.liveCard}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.liveBadge}>
                          <Radio size={14} /> LIVE EVENT
                        </span>
                        <ArrowUpRight size={23} />
                      </div>
                      <div className={styles.liveCardBody}>
                        <span className={styles.orgLabel}>
                          {brandLabel(
                            event.organization_name,
                            event.is_multi_org,
                          )}
                        </span>
                        <h3>{event.competition_name}</h3>
                        <span className={styles.eventKey}>
                          {event.event_key}
                        </span>
                      </div>
                      <div className={styles.liveCardFoot}>
                        <div>
                          <strong>{event.total_teams}</strong>
                          <span>Teams</span>
                        </div>
                        <div>
                          <strong>{event.total_matches}</strong>
                          <span>Matches</span>
                        </div>
                        <div>
                          <strong>{event.scouting_count}</strong>
                          <span>Scouting records</span>
                        </div>
                        <span className={styles.cardCta}>
                          View event <ArrowRight size={18} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section} aria-labelledby="archive-title">
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionIndex}>
                    {liveEvents.length ? "02" : "01"} / THE ARCHIVE
                  </span>
                  <h2 id="archive-title">Past competitions</h2>
                </div>
                <p>
                  Look back at the matches and teams that shaped each season.
                </p>
              </div>

              <div className={styles.filters}>
                <div className={styles.searchField}>
                  <Search size={21} aria-hidden="true" />
                  <label htmlFor="history-search" className={styles.srOnly}>
                    Search competitions
                  </label>
                  <input
                    id="history-search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search competitions"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchTerm("")}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className={styles.yearField}>
                  <label htmlFor="history-year" className={styles.srOnly}>
                    Filter by year
                  </label>
                  <CalendarDays size={20} aria-hidden="true" />
                  <select
                    id="history-year"
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                  >
                    <option value="">All years</option>
                    {uniqueYears.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>

              <div className={styles.resultsLine}>
                <span>
                  {filteredCompetitions.length}{" "}
                  {filteredCompetitions.length === 1
                    ? "competition"
                    : "competitions"}
                </span>
                <span>SELECT AN EVENT TO EXPLORE ITS DATA</span>
              </div>

              {filteredCompetitions.length ? (
                <div className={styles.archiveGrid}>
                  {filteredCompetitions.map((competition) => (
                    <Link
                      href={archiveHref(competition)}
                      key={`${competition.competition_key}-${competition.competition_year}-${competition.id}`}
                      className={styles.archiveCard}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.archiveBadge}>
                          {competition.competition_year} SEASON
                        </span>
                        <ArrowUpRight size={22} />
                      </div>
                      <div className={styles.archiveCardBody}>
                        <span className={styles.orgLabel}>
                          {brandLabel(
                            competition.organization_name,
                            competition.is_multi_org,
                          )}
                        </span>
                        <h3>{competition.competition_name}</h3>
                        <span className={styles.eventKey}>
                          {competition.competition_key}
                        </span>
                      </div>
                      <div className={styles.archiveStats}>
                        <div>
                          <strong>{competition.total_teams}</strong>
                          <span>Teams</span>
                        </div>
                        <div>
                          <strong>{competition.total_matches}</strong>
                          <span>Matches</span>
                        </div>
                      </div>
                      <div className={styles.archiveFoot}>
                        <span>
                          {competition.competition_location ? (
                            <>
                              <MapPin size={15} />{" "}
                              {competition.competition_location}
                            </>
                          ) : (
                            <>
                              <Users size={15} /> {competition.competition_year}{" "}
                              archive
                            </>
                          )}
                        </span>
                        <span>
                          Explore <ArrowRight size={17} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Archive size={35} />
                  <h3>{loadError ? 'History is unavailable' : 'No competitions found'}</h3>
                  <p>
                    {loadError
                      ? 'We could not retrieve the archive. Try again above.'
                      : query || yearFilter
                      ? "Try a different search or year."
                      : "No past competitions have been archived yet."}
                  </p>
                  {(query || yearFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setYearFilter("");
                      }}
                    >
                      Clear filters <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              )}
            </section>
          </main>

          <footer className={styles.footer}>
            <div>
              <span>AVALANCHE SCOUTING / TEAM 2724</span>
              <span>BUILT FOR MATCH DAY</span>
              <Link href="/">
                Back to home <ArrowUpRight size={16} />
              </Link>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
