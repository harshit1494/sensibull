import { useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, KeyRound, Lightbulb, Users, Waypoints } from 'lucide-react';
import { leaders, milestones, openings, team, values } from '@/data/about';

const icons = { users: Users, key: KeyRound, book: BookOpen, nodes: Waypoints, bulb: Lightbulb };

export function AboutPage() {
	const [openRole, setOpenRole] = useState<string | null>(null);
	const [applied, setApplied] = useState<string | null>(null);

	return (
		<>
			<section className="about-hero">
				<div className="about-hero-inner">
					<h1>
						The largest <br />
						<span>Options Trading Platform in India</span>
					</h1>
					<p>
						TIGERBULL was built to bring structure and sanity to options trading. We care deeply about thoughtful
						problem-solving, long-term thinking, and building products we’d trust with our own money.
					</p>
					<div className="about-hiring">
						<p className="hiring-pill">
							<span className="live-dot" /> &lt; We are looking for talented individuals /&gt;
						</p>
						<a className="primary-button" href="#openings">
							See Current Openings
						</a>
					</div>
				</div>
			</section>

			<section className="about-band">
				<div className="about-wrap">
					<h2>
						<span className="dim">Our</span> Journey
					</h2>
					<div className="timeline">
						<div className="timeline-line" />
						{milestones.map((item) => (
							<div key={item.value} className="timeline-item">
								<span className="timeline-dot" style={{ background: item.color }} />
								{item.label ? <p className="timeline-label">{item.label}</p> : null}
								<strong>{item.value}</strong>
								{item.sub ? <p className="timeline-label">{item.sub}</p> : null}
							</div>
						))}
					</div>
					<div className="backed">
						<p>Backed and funded by</p>
						<strong className="rainmatter">
							<span className="rain-mark" aria-hidden="true" /> Rainmatter
						</strong>
					</div>
					<p className="aside-note">We never needed money after that, so well, no backing from tagname VCs ;)</p>
					<h3 className="partnered">
						Partnered <span className="dim">with</span>
					</h3>
					<div className="broker-logos about-brokers">
						{[
							['zerodha', 'Zerodha'],
							['upstox', 'Upstox'],
							['angel-one', 'Angel One'],
							['icici', 'ICICI Direct'],
						].map(([file, name]) => (
							<img key={file} src={`https://sensibull.com/images/${file}-grayscale.webp`} alt={name} />
						))}
					</div>
				</div>
			</section>

			<section className="about-culture">
				<div className="about-wrap narrow">
					<h2>
						<span className="dim">Our</span> Culture
					</h2>
					<p>
						We are a small team of almost 40 people, mostly engineers. You will experience a flat hierarchy with no
						middle management and no room for politics. We have a culture of trust, high individual contribution,
						complete ownership, and a very steep learning curve.
					</p>
					<div className="value-row">
						{values.map((value) => {
							const Icon = icons[value.icon];
							return (
								<div key={value.name} className="value-chip">
									<Icon size={28} strokeWidth={1.6} />
									<span>{value.name}</span>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			<section className="about-band team-band">
				<div className="about-wrap">
					<h2>
						<span className="dim">Our</span> Leadership
					</h2>
					<p className="center-note">Founder-led, with leaders who’ve built, traded, and learned in real markets.</p>
					<div className="leader-row">
						{leaders.map((person) => (
							<article key={person.name} className="leader-card" tabIndex={0}>
								<img src={person.photo} alt={`${person.name}, ${person.role}`} />
								<div className="leader-meta">
									<strong>{person.name}</strong>
									<span>{person.role}</span>
								</div>
								<p className="leader-bio">{person.bio}</p>
							</article>
						))}
					</div>

					<h2 className="team-title">
						<span className="dim">Meet Our </span>Team
					</h2>
					<p className="center-note">A team driven by curiosity, accountability, and doing things right.</p>
					<div className="team-grid">
						{team.map((person) => (
							<article key={person.name} className="team-card" tabIndex={0}>
								<img
									src={`https://sensibull.com/images/team/${person.photo}.webp`}
									alt={`${person.name}, ${person.role}`}
								/>
								<strong>{person.name}</strong>
								<span>{person.role}</span>
								<p className="team-bio">{person.bio}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="about-culture" id="openings">
				<div className="about-wrap narrow">
					<h2>Current openings</h2>
					<p>Roles we are hiring for right now. Apply here — we read every note.</p>
					<div className="openings">
						{openings.map((role) => (
							<div key={role.title} className="opening">
								<button type="button" onClick={() => setOpenRole(openRole === role.title ? null : role.title)}>
									<span>
										<strong>{role.title}</strong>
										<em>
											{role.team} · {role.place} · {role.type}
										</em>
									</span>
									<span>{openRole === role.title ? 'Close' : 'Apply'}</span>
								</button>
								{openRole === role.title ? (
									applied === role.title ? (
										<p className="applied">Application noted. We’ll write to you at the email you used.</p>
									) : (
										<form
											className="apply-form"
											onSubmit={(event) => {
												event.preventDefault();
												setApplied(role.title);
											}}
										>
											<label>
												Name
												<input name="name" required placeholder="Your name" />
											</label>
											<label>
												Email
												<input name="email" type="email" required placeholder="you@email.com" />
											</label>
											<label>
												Why TIGERBULL
												<textarea name="note" required rows={3} placeholder="A few lines on what you’d build here" />
											</label>
											<button className="primary-button" type="submit">
												Send application
											</button>
										</form>
									)
								) : null}
							</div>
						))}
					</div>
					<p className="center-note">
						Already trade with us?{' '}
						<button
							type="button"
							className="inline-link"
							onClick={() => window.dispatchEvent(new Event('tigerbull-open-login'))}
						>
							Log in
						</button>{' '}
						or head back <Link to="/">home</Link>.
					</p>
				</div>
			</section>
		</>
	);
}
