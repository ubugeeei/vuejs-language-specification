<script setup lang="ts">
import { computed, ref } from "vue";

const loading = ref(false);
const nav = ref([
  { id: 1, href: "/", label: "Home" },
  { id: 2, href: "/reports", label: "Reports" },
]);
const rawCards = ref([
  { id: 1, count: 4 },
  { id: 2, count: 9 },
]);

const cards = computed(() =>
  rawCards.value.map((card) => ({
    id: card.id,
    title: `Card ${card.id}`,
    value: card.count,
  })),
);
</script>

<template>
  <div class="shell">
    <aside>
      <a v-for="entry in nav" :key="entry.id" :href="entry.href">{{ entry.label }}</a>
    </aside>
    <main>
      <section v-if="loading">Loading...</section>
      <section v-else>
        <article v-for="card in cards" :key="card.id">
          <h3>{{ card.title }}</h3>
          <p>{{ card.value }}</p>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
}
</style>
