<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Level;
use Illuminate\Http\Request;

class LevelController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Level::query()
                ->when($request->query('country_id'), fn ($query, $countryId) => $query->where('country_id', $countryId))
                ->orderBy('order')
                ->get()
        );
    }
}
