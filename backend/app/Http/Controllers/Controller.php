<?php

namespace App\Http\Controllers;

use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

abstract class Controller
{
    protected function authorize(string $ability, mixed $arguments = []): Response
    {
        return Gate::authorize($ability, $arguments);
    }
}
