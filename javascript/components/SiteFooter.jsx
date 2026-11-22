import { Link } from "react-router-dom";
import Brand from "./Brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand to="/" />
            <p>
              Track your institute contributions, deadlines, and official
              receipts in one secure student portal built for Tangub City Global
              College.
            </p>
          </div>

          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#about">About PayTrack</Link></li>
              <li><Link to="/signup">Create account</Link></li>
              <li><Link to="/login">Student login</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Support</h3>
            <ul>
              <li><Link to="/login">Account help</Link></li>
              <li><Link to="/#contact">Contact finance</Link></li>
              <li><Link to="/#top">Back to top</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>Visit us</h3>
            <p>Tangub City Global College</p>
            <p>Tangub City, Misamis Occidental</p>
            <p style={{ marginTop: 10 }}>
              <a href="mailto:finance@tcgc.edu.ph">finance@tcgc.edu.ph</a>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} TCGC PayTrack. All rights reserved.</span>
          <span>Made for Tangub City Global College</span>
        </div>
      </div>
    </footer>
  );
}
