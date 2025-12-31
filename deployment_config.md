# 🔐 Deployment Configuration Guide

This document lists all the Environment Variables (Secrets) required to make the Agentic CV Generator work in production.

## 1. Backend (Hugging Face Spaces)

Go to your Space -> **Settings** -> **Variables and secrets**.

| Name | Value Example | Type | Description |
| :--- | :--- | :--- | :--- |
| `GOOGLE_API_KEY` | `AIzaSy...` | **Secret** | Required for Gemini AI (Analysis, Editor, Layout). |
| `BASE_URL` | `https://your-space-name.hf.space` | **Secret** | **CRITICAL**: The public URL of your Hugging Face Space. Used to generate correct image links. *Do not add a trailing slash.* |

> **Reset Required**: After adding these, you MUST restart your Space (Factory Reboot) for them to take effect.

---

## 2. Frontend (Vercel)

Go to your Project -> **Settings** -> **Environment Variables**.

| Name | Value Example | Type | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-space-name.hf.space` | **Environment Variable** | Tells the frontend where to find the backend API. |

---

## 🔁 Verification Checklist

- [ ] **Backend**: Can you open `https://[your-space].hf.space/docs`?
- [ ] **Backend**: Does `https://[your-space].hf.space/images/template_1.png` show an image (or 404, but not connection error)?
- [ ] **Frontend**: consistently shows existing templates instead of blank boxes?
