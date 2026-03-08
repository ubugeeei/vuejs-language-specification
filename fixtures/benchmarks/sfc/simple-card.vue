<script setup lang="ts">
import { ref } from "vue";

const title = ref("Hello");
const body = ref("World");
</script>

<template>
  <article class="card">
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
  </article>
</template>

<style scoped>
.card {
  padding: 12px;
  border: 1px solid #ddd;
}
</style>
