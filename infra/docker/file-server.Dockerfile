ARG RUBY_VERSION=3.4.5

FROM ruby:${RUBY_VERSION}-slim AS base
WORKDIR /workspace/apps/file-server
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential curl libpq-dev libyaml-dev pkg-config postgresql-client && \
    rm -rf /var/lib/apt/lists/*

FROM base AS development
ENV BUNDLE_WITHOUT=""
COPY apps/file-server/Gemfile ./Gemfile
COPY apps/file-server/Gemfile.lock* ./
RUN bundle install
CMD ["bash"]

FROM base AS production
ENV RAILS_ENV=production
ENV BUNDLE_WITHOUT=development:test
COPY apps/file-server/Gemfile ./Gemfile
COPY apps/file-server/Gemfile.lock* ./
RUN bundle install
COPY apps/file-server .
RUN useradd --system --create-home --shell /bin/bash rails && chown -R rails:rails /workspace/apps/file-server
USER rails
EXPOSE 3002
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3002"]