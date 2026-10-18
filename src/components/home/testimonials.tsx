import { reviews } from '@/data/home';
export function Testimonials() {
 return <section className="testimonials"><h2>What Our Users Are Saying</h2><div className="review-stats"><span>4.8 Stars on App Store</span><span>4.5 Stars on Google Play</span><span>120K Downloads</span><span>140K Reviews</span></div><div className="review-grid">{reviews.map(r=><article key={r.name}><div className="review-stars">★★★★★</div><p>{r.text}</p><strong>{r.name}</strong></article>)}</div><h2 className="spotlight-title">In the Spotlight</h2><div className="press-logos">{['toi','mint','businessline','inc42','theprint','yourstory'].map(name=><img key={name} src={'https://sensibull.com/images/'+name+'-grayscale.webp'} alt={name} loading="lazy"/>)}</div></section>;
}
