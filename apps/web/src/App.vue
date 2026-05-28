<template>
  <AppShell />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import AppShell from './app/layouts/AppShell.vue';

export default defineComponent({
  name: 'App',
  components: {
    AppShell
  }
});
</script>