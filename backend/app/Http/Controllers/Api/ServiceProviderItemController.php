<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceProviderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ServiceProviderItemController extends Controller
{
    public function store(Request $request)
    {
        $provider = $request->user()->serviceProvider;
        abort_unless($provider, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('marketplace/items', 'public');
        }
        unset($validated['image']);

        $item = $provider->items()->create($validated);

        return response()->json($item, 201);
    }

    public function update(Request $request, ServiceProviderItem $item)
    {
        $this->abortUnlessOwner($request, $item);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('image')) {
            if ($item->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('marketplace/items', 'public');
        }
        unset($validated['image']);

        $item->update($validated);

        return response()->json($item);
    }

    public function destroy(Request $request, ServiceProviderItem $item)
    {
        $this->abortUnlessOwner($request, $item);

        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
        }
        $item->delete();

        return response()->json(status: 204);
    }

    private function abortUnlessOwner(Request $request, ServiceProviderItem $item): void
    {
        $item->loadMissing('serviceProvider');
        abort_unless($item->serviceProvider->user_id === $request->user()->id, 403);
    }
}
