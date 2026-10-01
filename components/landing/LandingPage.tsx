import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Menu,
  X,
} from "lucide-react";
import styles from "./LandingPage.module.css";

const workflow = [
  {
    number: "01",
    title: "Capture the match",
    copy: "Record what happened in auto, teleop, and endgame while the details are fresh.",
  },
  {
    number: "02",
    title: "Find the pattern",
    copy: "Turn observations and pit notes into a clearer picture of every robot.",
  },
  {
    number: "03",
    title: "Make the call",
    copy: "Compare teams and bring the right evidence to the strategy table.",
  },
];

function Brand({
  onClick,
  menuOpen = false,
}: {
  onClick?: () => void;
  menuOpen?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`${styles.brand} ${menuOpen ? styles.brandOpen : ""}`}
      onClick={onClick}
      aria-label="Avalanche Scouting home"
    >
      <span className={styles.brandMark}>
        <Image src="/image.png" alt="" width={48} height={48} priority />
      </span>
      <span className={styles.brandWords}>
        <strong>AVALANCHE</strong>
        <span>SCOUTING / 2724</span>
      </span>
    </Link>
  );
}

export function LandingLoader() {
  return (
    <div
      className={styles.loader}
      role="status"
      aria-live="polite"
      aria-label="Loading Avalanche Scouting"
    >
      <div className={styles.loaderMark}>
        <Image src="/image.png" alt="" width={92} height={92} priority />
      </div>
      <div className={styles.loaderType}>
        AVALANCHE <span>/ SCOUTING</span>
      </div>
      <div className={styles.loaderTrack}>
        <span />
      </div>
      <p>Preparing the scouting workspace</p>
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div
      className={styles.preview}
      aria-label="Illustration of the scouting workspace"
    >
      <div className={styles.previewTop}>
        <span className={styles.previewKicker}>
          <span className={styles.liveDot} /> FIELD VIEW / 2026
        </span>
        <span className={styles.previewTopRight}>AV / 2724</span>
      </div>
      <div className={styles.previewHeading}>
        <div>
          <span className={styles.previewOverline}>EVENT INTELLIGENCE</span>
          <h2>
            Every observation.
            <br />
            One clear picture.
          </h2>
        </div>
        <div className={styles.previewIcon}>
          <BarChart3 size={22} strokeWidth={1.5} />
        </div>
      </div>
      <div className={styles.previewTabs}>
        <span className={styles.previewTabActive}>MATCH DATA</span>
        <span>PIT NOTES</span>
        <span>TEAM VIEW</span>
      </div>
      <div className={styles.previewTable}>
        <div className={styles.previewTableHead}>
          <span>TEAM</span>
          <span>AUTO</span>
          <span>TELEOP</span>
          <span>READINESS</span>
        </div>
        <div className={styles.previewRow}>
          <strong>
            2724 <small>AVALANCHE</small>
          </strong>
          <span>18</span>
          <span>64</span>
          <em>
            <i style={{ width: "84%" }} />
          </em>
        </div>
        <div className={styles.previewRow}>
          <strong>
            1699 <small>ROBOTICS</small>
          </strong>
          <span>15</span>
          <span>58</span>
          <em>
            <i style={{ width: "73%" }} />
          </em>
        </div>
        <div className={styles.previewRow}>
          <strong>
            195 <small>ROBOTICS</small>
          </strong>
          <span>21</span>
          <span>61</span>
          <em>
            <i style={{ width: "79%" }} />
          </em>
        </div>
      </div>
      <div className={styles.previewBottom}>
        <span>
          <Check size={13} /> DATA SYNCED
        </span>
        <span>Illustrative preview</span>
      </div>
    </div>
  );
}

export default function LandingPage({
  errorMessage,
}: {
  errorMessage: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={styles.page}>
      <div className={styles.topline}>
        <span>BUILT FOR THE MOMENTS THAT MATTER</span>
        <span>FIRST ROBOTICS COMPETITION / TEAM 2724</span>
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand onClick={closeMenu} menuOpen={menuOpen} />
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#workflow">How it works</a>
            <Link href="/competition-history">Competition history</Link>
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.signIn} href="/auth/signin">
              Team sign in <ArrowUpRight size={16} />
            </Link>
            <button
              className={styles.menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        <nav
          id="landing-menu"
          className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!menuOpen}
        >
          <a href="#platform" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
            Platform <ArrowUpRight size={18} />
          </a>
          <a href="#workflow" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
            How it works <ArrowUpRight size={18} />
          </a>
          <Link
            href="/competition-history"
            onClick={closeMenu}
            tabIndex={menuOpen ? 0 : -1}
          >
            Competition history <ArrowUpRight size={18} />
          </Link>
          <Link
            href="/auth/signin"
            onClick={closeMenu}
            tabIndex={menuOpen ? 0 : -1}
          >
            Team sign in <ArrowUpRight size={18} />
          </Link>
          <div className={styles.menuFoot}>
            <span>AVALANCHE SCOUTING</span>
            <span>2026 SEASON</span>
          </div>
        </nav>
      </header>

      <main>
        {errorMessage && (
          <div className={styles.error} role="alert">
            {errorMessage}
          </div>
        )}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowLine} /> THE COMPETITION EDGE, MADE
              CLEAR
            </div>
            <h1 id="hero-title">
              Know the field.
              <br />
              <span>Make the call.</span>
            </h1>
            <p>
              Scouting tools for the people watching every match, asking better
              questions, and making the next decision count.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/auth/signin">
                Enter the workspace <ArrowUpRight size={19} />
              </Link>
              <Link className={styles.textAction} href="/competition-history">
                Explore competition history <ArrowRight size={18} />
              </Link>
            </div>
            <div className={styles.heroMeta}>
              <span>DESIGNED FOR TEAM 2724</span>
              <a href="#platform">
                DISCOVER THE PLATFORM <ArrowDown size={13} />
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.orbitLabel}>
              A BETTER VIEW OF EVERY MATCH <span>↗</span>
            </div>
            <WorkspacePreview />
            <span className={styles.visualIndex}>
              FIG. 01 / SCOUTING WORKSPACE
            </span>
          </div>
        </section>

        <section
          className={styles.intro}
          id="platform"
          aria-labelledby="platform-title"
        >
          <div className={styles.sectionLabel}>
            <span>01 / THE PLATFORM</span>
            <span>BUILT FOR MATCH DAY</span>
          </div>
          <div className={styles.introGrid}>
            <h2 id="platform-title">
              From the stands
              <br />
              to <em>strategy.</em>
            </h2>
            <div className={styles.introCopy}>
              <p>
                The strongest decisions start with observations you can trust.
                Avalanche Scouting brings match data, pit details, and team
                analysis into one focused workflow.
              </p>
              <Link href="/auth/signin">
                See your workspace <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className={styles.capabilities}>
            <div>
              <span>01 /</span>
              <strong>Record with purpose</strong>
              <p>
                Capture match performance with a form shaped around the game.
              </p>
            </div>
            <div>
              <span>02 /</span>
              <strong>See the full team</strong>
              <p>Connect match results and pit observations in one place.</p>
            </div>
            <div>
              <span>03 /</span>
              <strong>Plan with evidence</strong>
              <p>
                Compare teams and build a pick list with context behind the
                numbers.
              </p>
            </div>
          </div>
        </section>

        <section
          className={styles.workflow}
          id="workflow"
          aria-labelledby="workflow-title"
        >
          <div className={styles.sectionLabel}>
            <span>02 / THE WORKFLOW</span>
            <span>ONE SHARED PICTURE</span>
          </div>
          <div className={styles.workflowGrid}>
            <div className={styles.workflowIntro}>
              <h2 id="workflow-title">
                Built for the
                <br />
                <em>pace of play.</em>
              </h2>
              <p>
                From first observation to final alliance discussion, keep the
                information moving.
              </p>
            </div>
            <div className={styles.workflowSteps}>
              {workflow.map((step) => (
                <div className={styles.workflowStep} key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <span>READY WHEN THE MATCH STARTS</span>
          <h2 id="closing-title">
            Good data changes
            <br />
            <em>the conversation.</em>
          </h2>
          <Link className={styles.primaryAction} href="/auth/signin">
            Enter Avalanche Scouting <ArrowUpRight size={19} />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Brand />
        <span>© 2026 AVALANCHE ROBOTICS · FRC TEAM 2724</span>
        <Link href="/competition-history">
          COMPETITION HISTORY <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
