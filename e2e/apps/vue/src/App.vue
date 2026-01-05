<script setup lang="ts">
import { useAuth } from '@auth-code-pkce/vue';

const { isAuthenticated, isLoading, jwt, error, login, logout } = useAuth();
</script>

<template>
  <div v-if="isLoading" data-testid="loading">Loading...</div>
  <div v-else-if="error" data-testid="error">{{ error.code }}: {{ error.message }}</div>
  <div v-else-if="!isAuthenticated" data-testid="logged-out">
    <h1>Not logged in</h1>
    <button data-testid="login-btn" @click="login()">Login</button>
  </div>
  <div v-else data-testid="logged-in">
    <h1>Welcome!</h1>
    <div data-testid="user-sub">{{ jwt?.sub }}</div>
    <div data-testid="user-email">{{ jwt?.email }}</div>
    <button data-testid="logout-btn" @click="logout()">Logout</button>
  </div>
</template>
