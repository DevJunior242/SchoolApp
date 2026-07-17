<?php

namespace App\Providers;

use App\Notifications\Channels\BrevoChannel;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Notification::extend('brevo', fn ($app) => $app->make(BrevoChannel::class));

        // Le throttle numérique "throttle:X,Y" de Laravel se limite par
        // domaine+IP, pas par route : deux routes protégées par ce raccourci
        // partagent le même compteur. Un limiteur nommé par action évite
        // qu'elles se contaminent entre elles.
        RateLimiter::for('login-attempts', fn ($request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('register-attempts', fn ($request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('password-reset', fn ($request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('password-email', fn ($request) => Limit::perMinute(3)->by($request->ip()));
        RateLimiter::for('verification-email', fn ($request) => Limit::perMinute(3)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('activation-key-validate', fn ($request) => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('enrollment-requests', fn ($request) => Limit::perMinute(5)->by($request->ip()));
    }
}
