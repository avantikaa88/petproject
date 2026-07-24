import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Auth.css";

function Auth({
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isSignIn,
  setIsSignIn,
  confirmPassword,
  setConfirmPassword,
  formData,
  handleChange,
  handleSubmit,
  isLoading,
}) {
  return (
    <>
      <Navbar />

      <div className="auth-container">
        {/* LEFT SIDE - CENTERED FORM */}
        <div className="left-side">
          <div className="form-center-wrapper">
            <h1>{isSignIn ? "Welcome Back!" : "Create Account"}</h1>

            <p className="subtitle">
              {isSignIn
                ? "Good to see you and your furry friends again."
                : "Join PawShop and discover the best for your furry friends."}
            </p>

            {/* TOGGLE BUTTONS */}
            <div className="toggle-box">
              <button
                type="button"
                className={isSignIn ? "active-btn" : ""}
                onClick={() => setIsSignIn(true)}
              >
                Sign In
              </button>

              <button
                type="button"
                className={!isSignIn ? "active-btn" : ""}
                onClick={() => setIsSignIn(false)}
              >
                Create Account
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit}>
              {/* SIGN IN FORM */}
              {isSignIn ? (
                <>
                  <div className="input-group">
                    <label>Email or Username</label>
                    <div className="input-box">
                      <input
                        type="text"
                        name="email"
                        placeholder="name@example.com or username"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <div className="input-box">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="show-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>

                  <div className="form-options">
                    <p className="forgot-password">Forgot Password?</p>
                  </div>

                  <button className="signin-btn" type="submit" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </button>
                </>
              ) : (
                /* SIGN UP FORM */
                <>
                  <div className="input-group">
                    <label>Name</label>
                    <div className="input-box">
                      <input
                        type="text"
                        name="full_name"
                        placeholder="Ram"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Username</label>
                    <div className="input-box">
                      <input
                        type="text"
                        name="username"
                        placeholder="ramsingh123"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Email Address</label>
                    <div className="input-box">
                      <input
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Phone Number</label>
                    <div className="input-box">
                      <input
                        type="tel"
                        name="phone_number"
                        placeholder="+977 98XXXXXXXX"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Address</label>
                    <div className="input-box">
                      <input
                        type="text"
                        name="address"
                        placeholder="House no, Street, Tole, City"
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="input-group half">
                      <label>Gender</label>
                      <div className="input-box">
                        <select name="gender" onChange={handleChange}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="input-group half">
                      <label>Date of Birth</label>
                      <div className="input-box">
                        <input
                          type="date"
                          name="date_of_birth"
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <div className="input-box">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="show-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Confirm Password</label>
                    <div className="input-box">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirm_password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="show-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>

                  <button className="signin-btn" type="submit" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </button>
                </>
              )}
            </form>

            <p className="terms-text"></p>
          </div>
        </div>

        {/* RIGHT SIDE - IMAGE */}
        <div className="right-side">
          <div className="image-overlay"></div>
          <img
            src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=1000"
            alt="Happy dog"
          />
          <div className="image-quote">
            <p className="quote-text">Because they're more than just pets.</p>
            <p className="quote-subtext">
              Welcome back to the place that cares as much about your furry 
              family members as you do.
            </p>
            <div className="quote-stats">
              <span className="stat-number">15,000+</span>
              <span className="stat-label">pet parents in Nepal</span>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </>
  );
}

export default Auth;