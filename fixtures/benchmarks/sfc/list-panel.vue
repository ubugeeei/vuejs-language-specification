<script setup lang="ts">
import { ref } from "vue";

const title = ref("Items");
const items = ref([
  { id: 1, label: "Alpha" },
  { id: 2, label: "Beta" },
  { id: 3, label: "Gamma" },
]);
</script>

<template>
  <section class="panel">
    <header>{{ title }}</header>
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.label }}</li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 8px;
}
</style>
