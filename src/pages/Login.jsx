import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) return;

    onLogin({
      email,
      name: email.split("@")[0] || "Admin",
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">TV</div>

          <div>
            <h1>TrafficVision</h1>
            <span>AI Monitoring System</span>
          </div>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your traffic monitoring dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="admin@trafficvision.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <button type="button" className="forgot-btn">
              Forgot password?
            </button>
          </div>

          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>

        <div className="login-footer">
          <span>TrafficVision AI</span>
          <span>Secure Dashboard Access</span>
        </div>
      </div>
    </div>
  );
}

export default Login;