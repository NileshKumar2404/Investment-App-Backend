import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    /**
     * User who owns this session.
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * SHA-256 hash of the refresh token.
     *
     * IMPORTANT:
     * Never store the raw refresh token in MongoDB.
     */
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },

    /**
     * Session expiration time.
     */
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * When the session was revoked.
     *
     * null = session is still active.
     */
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * Last time this session was used to
     * refresh an access token.
     */
    lastUsedAt: {
      type: Date,
      default: null,
    },

    /**
     * IP address from which the session was created.
     */
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Browser/app user agent.
     */
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },

    /**
     * Optional device name supplied by the client.
     *
     * Example:
     * "Chrome on Windows"
     * "Android Phone"
     * "iPhone"
     */
    deviceName: {
      type: String,
      default: "Unknown Device",
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Quickly find active sessions for a user.
 */
sessionSchema.index({
  userId: 1,
  revokedAt: 1,
});

/**
 * Quickly clean up / query expired sessions.
 *
 * IMPORTANT:
 * This does NOT automatically revoke a session before
 * its expiry. It only allows MongoDB to remove expired
 * session records after the configured TTL.
 *
 * We still explicitly check `expiresAt` in the application.
 */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
                                                                                    