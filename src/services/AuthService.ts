import { User } from "../entity/User";
import { AppDataSource } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class AuthService {
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async register(
    email: string,
    password: string,
    name: string,
    role: string = "viewer"
  ): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = this.userRepo.create({
      email,
      password_hash: passwordHash,
      name,
      role,
      firebase_uid: null, // local user
    });

    const savedUser = await this.userRepo.save(user);

    // Generate JWT
    const token = this.generateToken(savedUser);

    return { user: savedUser, token };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password if user has password hash (local user)
    if (user.password_hash) {
      const isValid = await this.validatePassword(
        password,
        user.password_hash
      );
      if (!isValid) {
        throw new Error("Invalid email or password");
      }
    } else {
      // User has no password (e.g., Firebase-only user) -> cannot login with password
      throw new Error(
        "This account does not have a password set. Use Firebase login instead."
      );
    }

    // Generate JWT
    const token = this.generateToken(user);

    return { user, token };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const secret = process.env.JWT_SECRET ?? "dev-secret";
    return jwt.sign(payload, secret, { expiresIn: "12h" });
  }
}